"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface Staircase3DProps {
  stepCount: number;
  stepHeightM: number;
  stepWidthM: number;
  stairWidthM: number;
  floorHeightM: number;
  materialType: number; // 0=wood, 1=concrete, 2=metal+wood
}

// ── Materials ────────────────────────────────────────────────────────────────

function getMaterialColor(materialType: number) {
  switch (materialType) {
    case 0: return { step: "#C4A35A", stringer: "#8B6E3B", railing: "#6B4F2A" }; // wood
    case 1: return { step: "#A0A0A0", stringer: "#888888", railing: "#555555" }; // concrete
    case 2: return { step: "#C4A35A", stringer: "#555555", railing: "#444444" }; // metal+wood
    default: return { step: "#C4A35A", stringer: "#8B6E3B", railing: "#6B4F2A" };
  }
}

// ── Step component ───────────────────────────────────────────────────────────

function Step({ position, width, depth, height, color }: {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

// ── Stringer (косоур) ────────────────────────────────────────────────────────

function Stringer({ start, end, thickness, color }: {
  start: [number, number, number];
  end: [number, number, number];
  thickness: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  const { position, rotation, length } = useMemo(() => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const angle = Math.atan2(dy, dz);
    return {
      position: [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        (start[2] + end[2]) / 2,
      ] as [number, number, number],
      rotation: [angle, 0, 0] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow>
      <boxGeometry args={[thickness, thickness * 2, length]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
    </mesh>
  );
}

// ── Railing post (балясина) ──────────────────────────────────────────────────

function RailingPost({ position, height, color }: {
  position: [number, number, number];
  height: number;
  color: string;
}) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} castShadow>
      <boxGeometry args={[0.04, height, 0.04]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
    </mesh>
  );
}

// ── Handrail (поручень) ──────────────────────────────────────────────────────

function Handrail({ start, end, color }: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const { position, rotation, length } = useMemo(() => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const angle = Math.atan2(dy, dz);
    return {
      position: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2] as [number, number, number],
      rotation: [angle, 0, 0] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={[0.06, 0.05, length]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

// ── Floor plate ──────────────────────────────────────────────────────────────

function Floor({ width, depth, y, z }: { width: number; depth: number; y: number; z: number }) {
  return (
    <mesh position={[0, y - 0.025, z]} receiveShadow>
      <boxGeometry args={[width + 0.4, 0.05, depth + 0.3]} />
      <meshStandardMaterial color="#E8E0D0" roughness={0.9} metalness={0} />
    </mesh>
  );
}

// ── Main staircase scene ─────────────────────────────────────────────────────

function StaircaseScene({ stepCount, stepHeightM, stepWidthM, stairWidthM, materialType }: Staircase3DProps) {
  const colors = getMaterialColor(materialType);
  const stepThickness = 0.04; // 40mm step thickness
  const railingH = 0.9; // 900mm railing height
  const halfWidth = stairWidthM / 2;

  const totalH = stepCount * stepHeightM;
  const totalDepth = stepCount * stepWidthM;

  // Center the staircase
  const offsetY = -totalH / 2;
  const offsetZ = -totalDepth / 2;

  return (
    <group>
      {/* Ground floor */}
      <Floor width={stairWidthM} depth={0.5} y={offsetY} z={offsetZ - 0.25} />

      {/* Upper floor */}
      <Floor width={stairWidthM} depth={0.5} y={offsetY + totalH} z={offsetZ + totalDepth + 0.25} />

      {/* Steps */}
      {Array.from({ length: stepCount }, (_, i) => {
        const y = offsetY + (i + 1) * stepHeightM - stepThickness / 2;
        const z = offsetZ + (i + 0.5) * stepWidthM;
        return (
          <Step
            key={`step-${i}`}
            position={[0, y, z]}
            width={stairWidthM}
            depth={stepWidthM * 0.95}
            height={stepThickness}
            color={colors.step}
          />
        );
      })}

      {/* Stringers (косоуры) — left and right */}
      {[-1, 1].map((side) => (
        <Stringer
          key={`stringer-${side}`}
          start={[side * (halfWidth - 0.03), offsetY, offsetZ]}
          end={[side * (halfWidth - 0.03), offsetY + totalH, offsetZ + totalDepth]}
          thickness={0.05}
          color={colors.stringer}
        />
      ))}

      {/* Railing posts + handrail on left side */}
      {Array.from({ length: stepCount + 1 }, (_, i) => {
        const y = offsetY + i * stepHeightM;
        const z = offsetZ + i * stepWidthM;
        return (
          <RailingPost
            key={`post-${i}`}
            position={[-halfWidth - 0.03, y, z]}
            height={railingH}
            color={colors.railing}
          />
        );
      })}

      {/* Handrail */}
      <Handrail
        start={[-halfWidth - 0.03, offsetY + railingH, offsetZ]}
        end={[-halfWidth - 0.03, offsetY + totalH + railingH, offsetZ + totalDepth]}
        color={colors.railing}
      />
    </group>
  );
}

// ── Auto-rotate wrapper ──────────────────────────────────────────────────────

function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.15;
    }
  });
  return <group ref={ref}>{children}</group>;
}

// ── Exported component ───────────────────────────────────────────────────────

export default function Staircase3D(props: Staircase3DProps) {
  const totalH = props.stepCount * props.stepHeightM;
  const camDistance = Math.max(totalH, props.stepCount * props.stepWidthM) * 1.5 + 1;

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[camDistance * 0.7, camDistance * 0.5, camDistance * 0.7]} fov={45} />
        <OrbitControls
          enablePan={false}
          minDistance={1}
          maxDistance={camDistance * 2}
          maxPolarAngle={Math.PI * 0.85}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 4, -3]} intensity={0.3} />

        <AutoRotate>
          <StaircaseScene {...props} />
        </AutoRotate>

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -totalH / 2 - 0.05, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
      </Canvas>
    </div>
  );
}

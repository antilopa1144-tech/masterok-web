"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type * as THREE from "three";

interface Staircase3DProps {
  stepCount: number;
  stepHeightM: number;
  stepWidthM: number;
  stairWidthM: number;
  floorHeightM: number;
  materialType: number;
}

function getColors(materialType: number) {
  if (materialType === 1) return { step: "#A0A0A0", stringer: "#888888", rail: "#666666" };
  if (materialType === 2) return { step: "#C4A35A", stringer: "#555555", rail: "#444444" };
  return { step: "#C4A35A", stringer: "#8B6E3B", rail: "#6B4F2A" };
}

function StaircaseScene({ stepCount, stepHeightM, stepWidthM, stairWidthM, materialType }: Staircase3DProps) {
  const colors = getColors(materialType);
  const stepThick = 0.04;
  const halfW = stairWidthM / 2;
  const totalH = stepCount * stepHeightM;
  const totalD = stepCount * stepWidthM;
  const oY = -totalH / 2;
  const oZ = -totalD / 2;

  // Stringer angle
  const stringerLen = Math.sqrt(totalH * totalH + totalD * totalD);
  const angle = Math.atan2(totalH, totalD);

  return (
    <group>
      {/* Steps */}
      {Array.from({ length: stepCount }, (_, i) => (
        <mesh key={i} position={[0, oY + (i + 1) * stepHeightM - stepThick / 2, oZ + (i + 0.5) * stepWidthM]} castShadow>
          <boxGeometry args={[stairWidthM, stepThick, stepWidthM * 0.92]} />
          <meshStandardMaterial color={colors.step} />
        </mesh>
      ))}

      {/* Stringers */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (halfW - 0.025), oY + totalH / 2, oZ + totalD / 2]}
          rotation={[angle, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.05, 0.08, stringerLen]} />
          <meshStandardMaterial color={colors.stringer} />
        </mesh>
      ))}

      {/* Railing posts */}
      {Array.from({ length: Math.min(stepCount + 1, 20) }, (_, i) => (
        <mesh
          key={`post-${i}`}
          position={[-halfW - 0.03, oY + i * stepHeightM + 0.45, oZ + i * stepWidthM]}
          castShadow
        >
          <boxGeometry args={[0.035, 0.9, 0.035]} />
          <meshStandardMaterial color={colors.rail} />
        </mesh>
      ))}

      {/* Handrail */}
      <mesh
        position={[-halfW - 0.03, oY + totalH / 2 + 0.9, oZ + totalD / 2]}
        rotation={[angle, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.05, 0.04, stringerLen]} />
        <meshStandardMaterial color={colors.rail} />
      </mesh>

      {/* Floor plates */}
      <mesh position={[0, oY - 0.025, oZ - 0.15]} receiveShadow>
        <boxGeometry args={[stairWidthM + 0.3, 0.05, 0.4]} />
        <meshStandardMaterial color="#E8E0D0" />
      </mesh>
      <mesh position={[0, oY + totalH - 0.025, oZ + totalD + 0.15]} receiveShadow>
        <boxGeometry args={[stairWidthM + 0.3, 0.05, 0.4]} />
        <meshStandardMaterial color="#E8E0D0" />
      </mesh>
    </group>
  );
}

function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.15; });
  return <group ref={ref}>{children}</group>;
}

export default function Staircase3D(props: Staircase3DProps) {
  const d = Math.max(props.stepCount * props.stepHeightM, props.stepCount * props.stepWidthM) * 1.5 + 1;

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
      <Canvas shadows camera={{ position: [d * 0.7, d * 0.5, d * 0.7], fov: 45 }}>
        <OrbitControls enablePan={false} minDistance={1} maxDistance={d * 3} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 4, -3]} intensity={0.3} />
        <AutoRotate>
          <StaircaseScene {...props} />
        </AutoRotate>
      </Canvas>
    </div>
  );
}

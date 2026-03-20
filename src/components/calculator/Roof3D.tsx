"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface Roof3DProps {
  spanM: number;
  lengthM: number;
  slopeAngle: number;
  roofType: number;
  overhangM: number;
}

function getRoofColor(t: number) {
  const colors = ["#8B2500", "#4A4A4A", "#6B8E23", "#8B0000", "#708090", "#CD853F"];
  return colors[t] ?? colors[0];
}

function RoofSlope({ vertices, color }: { vertices: number[][]; color: string }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array([
      ...vertices[0], ...vertices[1], ...vertices[2],
      ...vertices[2], ...vertices[3], ...vertices[0],
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [vertices]);

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

function RoofScene({ spanM, lengthM, slopeAngle, roofType, overhangM }: Roof3DProps) {
  const hS = spanM / 2;
  const hL = lengthM / 2;
  const rad = (slopeAngle * Math.PI) / 180;
  const ridgeH = hS * Math.tan(rad);
  const wallH = 2.5;
  const color = getRoofColor(roofType);
  const ov = overhangM;

  const leftSlope = useMemo(() => [
    [-hS - ov, wallH, -hL - ov],
    [0, wallH + ridgeH, -hL - ov],
    [0, wallH + ridgeH, hL + ov],
    [-hS - ov, wallH, hL + ov],
  ], [hS, hL, wallH, ridgeH, ov]);

  const rightSlope = useMemo(() => [
    [hS + ov, wallH, -hL - ov],
    [0, wallH + ridgeH, -hL - ov],
    [0, wallH + ridgeH, hL + ov],
    [hS + ov, wallH, hL + ov],
  ], [hS, hL, wallH, ridgeH, ov]);

  return (
    <group position={[0, -wallH / 2 - ridgeH / 4, 0]}>
      {/* Walls */}
      {[[-hS, 0], [hS, 0]].map(([x], i) => (
        <mesh key={`wl-${i}`} position={[x, wallH / 2, 0]} receiveShadow>
          <boxGeometry args={[0.25, wallH, lengthM]} />
          <meshStandardMaterial color="#E8DCC8" />
        </mesh>
      ))}
      {[[-hL], [hL]].map(([z], i) => (
        <mesh key={`ws-${i}`} position={[0, wallH / 2, z]} receiveShadow>
          <boxGeometry args={[spanM, wallH, 0.25]} />
          <meshStandardMaterial color="#DDD0BC" />
        </mesh>
      ))}

      {/* Roof slopes */}
      <RoofSlope vertices={leftSlope} color={color} />
      <RoofSlope vertices={rightSlope} color={color} />

      {/* Ridge */}
      <mesh position={[0, wallH + ridgeH, 0]}>
        <boxGeometry args={[0.08, 0.08, lengthM + ov * 2 + 0.1]} />
        <meshStandardMaterial color="#555" metalness={0.4} />
      </mesh>

      {/* Foundation */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[spanM + 0.5, 0.3, lengthM + 0.5]} />
        <meshStandardMaterial color="#999" />
      </mesh>
    </group>
  );
}

function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.12; });
  return <group ref={ref}>{children}</group>;
}

export default function Roof3D(props: Roof3DProps) {
  const d = Math.max(props.spanM, props.lengthM) * 1.2 + 3;

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900">
      <Canvas shadows>
        <perspectiveCamera position={[d * 0.8, d * 0.6, d * 0.8]} />
        <OrbitControls enablePan={false} minDistance={2} maxDistance={d * 3} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[8, 12, 6]} intensity={1.3} castShadow />
        <directionalLight position={[-4, 6, -4]} intensity={0.25} />
        <AutoRotate>
          <RoofScene {...props} />
        </AutoRotate>
      </Canvas>
    </div>
  );
}

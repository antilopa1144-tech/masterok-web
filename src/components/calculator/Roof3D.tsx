"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface Roof3DProps {
  spanM: number;       // building width (span)
  lengthM: number;     // building length (ridge length)
  slopeAngle: number;  // degrees
  roofType: number;    // 0-5
  overhangM: number;   // eave overhang
}

function getRoofColor(roofType: number) {
  switch (roofType) {
    case 0: return "#8B2500"; // metal tile — dark red
    case 1: return "#4A4A4A"; // bitumen — dark grey
    case 2: return "#6B8E23"; // profiled sheet — olive green
    case 3: return "#8B0000"; // ondulin — burgundy
    case 4: return "#708090"; // slate — slate grey
    case 5: return "#CD853F"; // ceramic — terracotta
    default: return "#8B2500";
  }
}

// ── Roof slope panel ─────────────────────────────────────────────────────────

function RoofPanel({ vertices, color }: { vertices: THREE.Vector3[]; color: string }) {
  const geometry = new THREE.BufferGeometry();
  // Two triangles to make a quad
  const positions = new Float32Array([
    vertices[0].x, vertices[0].y, vertices[0].z,
    vertices[1].x, vertices[1].y, vertices[1].z,
    vertices[2].x, vertices[2].y, vertices[2].z,
    vertices[2].x, vertices[2].y, vertices[2].z,
    vertices[3].x, vertices[3].y, vertices[3].z,
    vertices[0].x, vertices[0].y, vertices[0].z,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Building walls ───────────────────────────────────────────────────────────

function Wall({ position, size, color }: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0} />
    </mesh>
  );
}

// ── Gable (фронтон) ─────────────────────────────────────────────────────────

function Gable({ halfSpan, ridgeH, z, wallH }: {
  halfSpan: number;
  ridgeH: number;
  z: number;
  wallH: number;
}) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfSpan, wallH);
  shape.lineTo(halfSpan, wallH);
  shape.lineTo(0, wallH + ridgeH);
  shape.closePath();

  return (
    <mesh position={[0, 0, z]} castShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#E8DCC8" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Ridge beam (конёк) ───────────────────────────────────────────────────────

function Ridge({ y, z1, z2 }: { y: number; z1: number; z2: number }) {
  const len = Math.abs(z2 - z1);
  return (
    <mesh position={[0, y, (z1 + z2) / 2]}>
      <boxGeometry args={[0.08, 0.08, len + 0.1]} />
      <meshStandardMaterial color="#555" roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

// ── Main roof scene ──────────────────────────────────────────────────────────

function RoofScene({ spanM, lengthM, slopeAngle, roofType, overhangM }: Roof3DProps) {
  const halfSpan = spanM / 2;
  const halfLen = lengthM / 2;
  const slopeRad = (slopeAngle * Math.PI) / 180;
  const ridgeH = halfSpan * Math.tan(slopeRad);
  const slopeLen = halfSpan / Math.cos(slopeRad);
  const wallH = 2.5; // standard wall height
  const color = getRoofColor(roofType);
  const ov = overhangM;

  // Roof panels (two slopes)
  const leftSlope: THREE.Vector3[] = [
    new THREE.Vector3(-halfSpan - ov, wallH, -halfLen - ov),
    new THREE.Vector3(0, wallH + ridgeH, -halfLen - ov),
    new THREE.Vector3(0, wallH + ridgeH, halfLen + ov),
    new THREE.Vector3(-halfSpan - ov, wallH, halfLen + ov),
  ];

  const rightSlope: THREE.Vector3[] = [
    new THREE.Vector3(halfSpan + ov, wallH, -halfLen - ov),
    new THREE.Vector3(0, wallH + ridgeH, -halfLen - ov),
    new THREE.Vector3(0, wallH + ridgeH, halfLen + ov),
    new THREE.Vector3(halfSpan + ov, wallH, halfLen + ov),
  ];

  return (
    <group position={[0, -wallH / 2 - ridgeH / 4, 0]}>
      {/* Walls */}
      <Wall position={[-halfSpan, wallH / 2, 0]} size={[0.3, wallH, lengthM]} color="#E8DCC8" />
      <Wall position={[halfSpan, wallH / 2, 0]} size={[0.3, wallH, lengthM]} color="#E8DCC8" />
      <Wall position={[0, wallH / 2, -halfLen]} size={[spanM, wallH, 0.3]} color="#DDD0BC" />
      <Wall position={[0, wallH / 2, halfLen]} size={[spanM, wallH, 0.3]} color="#DDD0BC" />

      {/* Gables */}
      <Gable halfSpan={halfSpan} ridgeH={ridgeH} z={-halfLen} wallH={wallH} />
      <Gable halfSpan={halfSpan} ridgeH={ridgeH} z={halfLen} wallH={wallH} />

      {/* Roof slopes */}
      <RoofPanel vertices={leftSlope} color={color} />
      <RoofPanel vertices={rightSlope} color={color} />

      {/* Ridge */}
      <Ridge y={wallH + ridgeH} z1={-halfLen - ov} z2={halfLen + ov} />

      {/* Foundation */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[spanM + 0.6, 0.3, lengthM + 0.6]} />
        <meshStandardMaterial color="#999" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── Auto-rotate ──────────────────────────────────────────────────────────────

function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12;
  });
  return <group ref={ref}>{children}</group>;
}

// ── Exported component ───────────────────────────────────────────────────────

export default function Roof3D(props: Roof3DProps) {
  const maxDim = Math.max(props.spanM, props.lengthM);
  const camDist = maxDim * 1.2 + 3;

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900">
      <Canvas shadows gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[camDist * 0.8, camDist * 0.6, camDist * 0.8]} fov={40} />
        <OrbitControls enablePan={false} minDistance={2} maxDistance={camDist * 2.5} maxPolarAngle={Math.PI * 0.85} />

        <ambientLight intensity={0.45} />
        <directionalLight position={[8, 12, 6]} intensity={1.3} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-4, 6, -4]} intensity={0.25} />

        <AutoRotate>
          <RoofScene {...props} />
        </AutoRotate>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <shadowMaterial opacity={0.1} />
        </mesh>
      </Canvas>
    </div>
  );
}

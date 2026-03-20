"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Roof3DProps {
  spanM: number;
  lengthM: number;
  slopeAngle: number;
  roofType: number;
  overhangM: number;
}

function getRoofColor(t: number): number {
  const c = [0x8b2500, 0x4a4a4a, 0x6b8e23, 0x8b0000, 0x708090, 0xcd853f];
  return c[t] ?? c[0];
}

function makeQuad(v: number[][]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array([
    ...v[0], ...v[1], ...v[2],
    ...v[2], ...v[3], ...v[0],
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export default function Roof3D({ spanM, lengthM, slopeAngle, roofType, overhangM }: Roof3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xedf5ff);

    const maxDim = Math.max(spanM, lengthM);
    const camDist = maxDim * 1.2 + 3;
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 200);
    camera.position.set(camDist * 0.8, camDist * 0.6, camDist * 0.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = camDist * 3;
    controls.target.set(0, 1, 0);
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 1.3);
    dir.position.set(8, 12, 6);
    dir.castShadow = true;
    scene.add(dir);

    const group = new THREE.Group();
    const hS = spanM / 2;
    const hL = lengthM / 2;
    const rad = (slopeAngle * Math.PI) / 180;
    const ridgeH = hS * Math.tan(rad);
    const wallH = 2.5;
    const ov = overhangM;
    const roofColor = getRoofColor(roofType);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8 });
    const wallMatSide = new THREE.MeshStandardMaterial({ color: 0xddd0bc });

    for (const x of [-hS, hS]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, lengthM), wallMat);
      m.position.set(x, wallH / 2, 0);
      m.receiveShadow = true;
      group.add(m);
    }
    for (const z of [-hL, hL]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(spanM, wallH, 0.25), wallMatSide);
      m.position.set(0, wallH / 2, z);
      m.receiveShadow = true;
      group.add(m);
    }

    // Roof slopes
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 });

    const leftSlope = makeQuad([
      [-hS - ov, wallH, -hL - ov],
      [0, wallH + ridgeH, -hL - ov],
      [0, wallH + ridgeH, hL + ov],
      [-hS - ov, wallH, hL + ov],
    ]);
    const lm = new THREE.Mesh(leftSlope, roofMat);
    lm.castShadow = true;
    lm.receiveShadow = true;
    group.add(lm);

    const rightSlope = makeQuad([
      [hS + ov, wallH, -hL - ov],
      [0, wallH + ridgeH, -hL - ov],
      [0, wallH + ridgeH, hL + ov],
      [hS + ov, wallH, hL + ov],
    ]);
    const rm = new THREE.Mesh(rightSlope, roofMat);
    rm.castShadow = true;
    rm.receiveShadow = true;
    group.add(rm);

    // Ridge
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, lengthM + ov * 2 + 0.1),
      new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4 }),
    );
    ridge.position.set(0, wallH + ridgeH, 0);
    group.add(ridge);

    // Foundation
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(spanM + 0.5, 0.3, lengthM + 0.5),
      new THREE.MeshStandardMaterial({ color: 0x999999 }),
    );
    foundation.position.set(0, -0.15, 0);
    foundation.receiveShadow = true;
    group.add(foundation);

    group.position.y = -wallH / 2 - ridgeH / 4;
    scene.add(group);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      group.rotation.y += 0.002;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => cleanupRef.current?.();
  }, [spanM, lengthM, slopeAngle, roofType, overhangM]);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
    />
  );
}

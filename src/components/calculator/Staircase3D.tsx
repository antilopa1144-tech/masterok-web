"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Staircase3DProps {
  stepCount: number;
  stepHeightM: number;
  stepWidthM: number;
  stairWidthM: number;
  floorHeightM: number;
  materialType: number;
}

function getColors(t: number) {
  if (t === 1) return { step: 0xa0a0a0, stringer: 0x888888, rail: 0x666666 };
  if (t === 2) return { step: 0xc4a35a, stringer: 0x555555, rail: 0x444444 };
  return { step: 0xc4a35a, stringer: 0x8b6e3b, rail: 0x6b4f2a };
}

function addBox(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function buildStaircase(props: Staircase3DProps): THREE.Group {
  const { stepCount, stepHeightM, stepWidthM, stairWidthM, materialType } = props;
  const colors = getColors(materialType);
  const group = new THREE.Group();
  const totalH = stepCount * stepHeightM;
  const totalD = stepCount * stepWidthM;
  const oY = -totalH / 2;
  const oZ = -totalD / 2;
  const halfW = stairWidthM / 2;
  const stepThick = 0.04;

  // Steps
  for (let i = 0; i < stepCount; i++) {
    addBox(group, stairWidthM, stepThick, stepWidthM * 0.92,
      0, oY + (i + 1) * stepHeightM - stepThick / 2, oZ + (i + 0.5) * stepWidthM, colors.step);
  }

  // Stringers
  const stringerLen = Math.sqrt(totalH * totalH + totalD * totalD);
  const angle = Math.atan2(totalH, totalD);
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.08, stringerLen),
      new THREE.MeshStandardMaterial({ color: colors.stringer }),
    );
    mesh.position.set(side * (halfW - 0.025), oY + totalH / 2, oZ + totalD / 2);
    mesh.rotation.x = angle;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // Railing posts
  const postCount = Math.min(stepCount + 1, 20);
  for (let i = 0; i < postCount; i++) {
    addBox(group, 0.035, 0.9, 0.035,
      -halfW - 0.03, oY + i * stepHeightM + 0.45, oZ + i * stepWidthM, colors.rail);
  }

  // Handrail
  const hrMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.04, stringerLen),
    new THREE.MeshStandardMaterial({ color: colors.rail }),
  );
  hrMesh.position.set(-halfW - 0.03, oY + totalH / 2 + 0.9, oZ + totalD / 2);
  hrMesh.rotation.x = angle;
  hrMesh.castShadow = true;
  group.add(hrMesh);

  // Floor plates
  addBox(group, stairWidthM + 0.3, 0.05, 0.4, 0, oY - 0.025, oZ - 0.15, 0xe8e0d0);
  addBox(group, stairWidthM + 0.3, 0.05, 0.4, 0, oY + totalH - 0.025, oZ + totalD + 0.15, 0xe8e0d0);

  return group;
}

export default function Staircase3D(props: Staircase3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    animId: number;
  } | null>(null);

  // Init renderer once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-3, 4, -3);
    scene.add(dirLight2);

    const group = new THREE.Group();
    scene.add(group);

    let animId: number = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      group.rotation.y += 0.003;
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

    sceneRef.current = { renderer, scene, camera, controls, group, animId };

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  // Update geometry when props change
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    // Clear old geometry
    while (ctx.group.children.length > 0) {
      const child = ctx.group.children[0];
      ctx.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    // Build new staircase
    const newGroup = buildStaircase(props);
    while (newGroup.children.length > 0) {
      const child = newGroup.children[0];
      newGroup.remove(child);
      ctx.group.add(child);
    }

    // Update camera position
    const totalH = props.stepCount * props.stepHeightM;
    const totalD = props.stepCount * props.stepWidthM;
    const camDist = Math.max(totalH, totalD) * 1.5 + 1;
    ctx.camera.position.set(camDist * 0.7, camDist * 0.5, camDist * 0.7);
    ctx.controls.target.set(0, totalH * 0.3, 0);
    ctx.controls.minDistance = 1;
    ctx.controls.maxDistance = camDist * 3;
    ctx.controls.update();
  }, [props.stepCount, props.stepHeightM, props.stepWidthM, props.stairWidthM, props.materialType]);

  return (
    <div ref={containerRef} className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" />
  );
}

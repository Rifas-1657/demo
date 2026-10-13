// @ts-nocheck
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { IqraLighting } from "./Lighting";
import { IqraEnvironment } from "./Environment";
import { Book3D } from "@/components/book/Book3D";

interface SceneProps {
  children?: React.ReactNode;
}

/** Main R3F Canvas — the 3D scene root for IqraBook */
export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop="always"
      camera={{ position: [0, 1.85, 11.4], fov: 36, near: 0.1, far: 80 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#0F0F1A", 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        scene.fog = new THREE.Fog("#0F0F1A", 12, 42);
      }}
      style={{ width: "100%", height: "100%", background: "#0F0F1A" }}
    >
      <color attach="background" args={["#0F0F1A"]} />
      <fog attach="fog" args={["#0F0F1A", 12, 42]} />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 4.2}
        target={[0, 0.05, 0]}
        dampingFactor={0.08}
        enableDamping
      />

      <IqraLighting />
      <IqraEnvironment />
      <Stars
        radius={60}
        depth={40}
        count={1600}
        factor={2.2}
        saturation={0.2}
        fade
        speed={0.28}
      />

      <Book3D />
      {children}
    </Canvas>
  );
}

// @ts-nocheck
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/** Floating desk/shelf environment for IqraBook — minimal, warm, study-room vibe */
export function IqraEnvironment() {
  const dustRef = useRef<THREE.Points>(null);

  // Slowly rotate dust particles
  useFrame((_, delta) => {
    if (dustRef.current) {
      dustRef.current.rotation.y += delta * 0.02;
    }
  });

  // Generate floating dust/particle positions
  const dustPositions = new Float32Array(
    Array.from({ length: 150 }, () => [
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 20,
    ]).flat()
  );

  return (
    <group>
      {/* Desk surface */}
      <RoundedBox
        args={[14, 0.15, 7]}
        radius={0.05}
        receiveShadow
        position={[0, -2.5, 0]}
      >
        <meshStandardMaterial
          color="#5C3D2E"
          roughness={0.7}
          metalness={0.1}
        />
      </RoundedBox>

      {/* Desk front edge */}
      <mesh receiveShadow position={[0, -2.58, 3.4]}>
        <boxGeometry args={[14, 0.08, 0.2]} />
        <meshStandardMaterial color="#4A2F20" roughness={0.8} />
      </mesh>

      {/* Back wall — deep dark */}
      <mesh position={[0, 3, -5]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#0F0F1A" roughness={1} />
      </mesh>

      {/* Floating book shelf (left) */}
      <group position={[-5.5, 1.5, -3]}>
        <RoundedBox args={[3, 0.1, 0.6]} radius={0.02}>
          <meshStandardMaterial color="#7B4F2E" roughness={0.7} />
        </RoundedBox>
        {/* Shelf bracket */}
        <mesh position={[-1.2, -0.4, 0]}>
          <boxGeometry args={[0.08, 0.8, 0.5]} />
          <meshStandardMaterial color="#5C3820" roughness={0.8} />
        </mesh>
        {/* Decorative book spines on shelf */}
        {[0, 0.3, 0.6, 0.9].map((x, i) => (
          <mesh key={i} position={[-1 + x, 0.3, 0]}>
            <boxGeometry
              args={[0.22, [0.8, 1.0, 0.7, 0.9][i], 0.45]}
            />
            <meshStandardMaterial
              color={["#E63946", "#FF9F1C", "#FFD166", "#FF6B8A"][i]}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Subtle lamp on desk (right) */}
      <group position={[4.5, -1.8, 0]}>
        {/* Lamp base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.2, 0.08, 16]} />
          <meshStandardMaterial color="#2C2C3E" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Lamp pole */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.4, 8]} />
          <meshStandardMaterial color="#2C2C3E" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Lamp shade */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <coneGeometry args={[0.35, 0.3, 16, 1, true]} />
          <meshStandardMaterial
            color="#FFF5E0"
            side={THREE.DoubleSide}
            emissive="#FF9F1C"
            emissiveIntensity={0.1}
            roughness={0.8}
          />
        </mesh>
        {/* Lamp glow bulb */}
        <pointLight position={[0, 1.2, 0]} intensity={0.5} color="#FFF5E0" distance={4} />
      </group>

      {/* Floating dust particles — cozy atmosphere */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#FFD166"
          transparent
          opacity={0.3}
          sizeAttenuation
        />
      </points>

      {/* Floor shadow catcher */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.58, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.4} />
      </mesh>
    </group>
  );
}

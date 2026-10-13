// @ts-nocheck
"use client";

/** Warm study-room lighting for IqraBook */
export function IqraLighting() {
  return (
    <>
      <ambientLight intensity={0.62} color="#FFF8F0" />

      <directionalLight
        castShadow
        position={[4.5, 7.5, 5]}
        intensity={1.55}
        color="#FFF5E0"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0002}
      />

      <pointLight
        position={[-4, 3.2, 2.4]}
        intensity={0.7}
        color="#FF6B8A"
        distance={14}
      />

      <pointLight
        position={[0.4, 1.4, 3.2]}
        intensity={0.85}
        color="#FFD166"
        distance={10}
      />

      <pointLight
        position={[0, 0.2, -4]}
        intensity={0.45}
        color="#FF9F1C"
        distance={12}
      />

      <hemisphereLight args={["#FFF8F0", "#1A1A2E", 0.45]} />
    </>
  );
}

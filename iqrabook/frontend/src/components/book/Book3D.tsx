// @ts-nocheck — R3F JSX types work in Next.js build; standalone tsc needs this
"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import { Group } from "three";
import * as THREE from "three";
import { Page } from "@/components/book/Page";
import { useBookStore } from "@/stores/bookStore";
import { useSessionStore } from "@/stores/sessionStore";

const PLACEHOLDER_LEFT = `بِسْمِ اللَّٰهِ الرَّحْمَٰنِ الرَّحِيمِ

Welcome to IqraBook!
اقْرَأْ — Read in the name of your Lord.

Your AI Tutor is getting ready...

Oru nimisham wait pannunga — 
AI ungalukku sollikku varudhu!

Python la oru oru concept ah
romba azhaga explain pannuvom.

Voice la kettu padikaalam,
Questions kekkalam, code run pannalam!

InSha'Allah nalla padippom.`;

const PLACEHOLDER_RIGHT = `How this works:

🎤 Mic button → Ask questions
   (Hold to record your voice)

⌨️  Keyboard → Type questions

📖 < > buttons → Navigate pages

🔄 Scroll → Flip pages

💻 Code panel → Run Python live
   in your browser!

📊 Diagrams → Visual learning

The AI speaks Tanglish —
Tamil + English mixed,
just like how we talk!

Ready? Let's start!`;

function makeCoverTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 980, 1024);
  g.addColorStop(0, "#FF9F1C");
  g.addColorStop(0.45, "#FFD166");
  g.addColorStop(1, "#E8890C");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 4800; i++) {
    ctx.fillStyle = `rgba(80, 40, 0, ${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }
  ctx.strokeStyle = "rgba(255, 248, 240, 0.12)";
  ctx.lineWidth = 18;
  ctx.strokeRect(36, 36, 952, 952);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function Book3D() {
  const { pages, currentPage, addPage, totalPages, isFlipping } = useBookStore();
  const wordIndex = useSessionStore((s) => s.voice.currentWord);
  const bookRef = useRef<Group>(null);
  const coverTex = useMemo(() => makeCoverTexture(), []);

  useEffect(() => {
    if (totalPages === 0) {
      addPage({ content: PLACEHOLDER_LEFT, type: "lesson" });
      addPage({ content: PLACEHOLDER_RIGHT, type: "lesson" });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    if (bookRef.current) {
      const t = clock.getElapsedTime();
      bookRef.current.position.y = 0.12 + Math.sin(t * 0.75) * 0.035;
      bookRef.current.rotation.y = Math.sin(t * 0.28) * 0.018;
    }
  });

  const [{ flipProg }, api] = useSpring(() => ({
    flipProg: 0,
    config: { tension: 140, friction: 18 },
  }));

  useEffect(() => {
    api.start({ flipProg: currentPage });
  }, [currentPage, api]);

  const leftPage = pages[currentPage * 2];
  const rightPage = pages[currentPage * 2 + 1];

  return (
    <group ref={bookRef} position={[0, 0.2, 0]} scale={0.72}>
      {/* Shadow plane — receives shadows only */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.15, 0.2]}
        receiveShadow
      >
        <planeGeometry args={[8, 6]} />
        <shadowMaterial opacity={0.45} />
      </mesh>

      {/* Back cover — orange → gold */}
      <RoundedBox
        args={[6.6, 4.6, 0.08]}
        radius={0.04}
        position={[0, 0, -0.18]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          map={coverTex || undefined}
          color="#FF9F1C"
          emissive="#FFD166"
          emissiveIntensity={0.18}
          roughness={0.42}
          metalness={0.22}
        />
      </RoundedBox>

      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[0.28, 4.6, 0.22]} />
        <meshStandardMaterial color="#D4A574" roughness={0.7} />
      </mesh>

      {/* Cover title strip */}
      <mesh position={[0, 2.15, 0.06]} castShadow>
        <boxGeometry args={[6.6, 0.4, 0.01]} />
        <meshStandardMaterial
          color="#E63946"
          roughness={0.4}
          emissive="#E63946"
          emissiveIntensity={0.15}
        />
      </mesh>
      <Html position={[0, 2.15, 0.08]} center zIndexRange={[0, 5]}>
        <div
          style={{
            color: "#FFF8F0",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            userSelect: "none",
            textShadow: "0 0 12px rgba(230,57,70,0.8)",
          }}
        >
          IqraBook
        </div>
      </Html>

      {totalPages === 0 && (
        <RoundedBox
          args={[6.6, 4.6, 0.06]}
          radius={0.04}
          position={[0, 0, 0.02]}
          castShadow
        >
          <meshStandardMaterial
            map={coverTex || undefined}
            color="#FF9F1C"
            emissive="#FFD166"
            emissiveIntensity={0.16}
            roughness={0.42}
            metalness={0.2}
          />
        </RoundedBox>
      )}

      {leftPage && (
        <Page
          pageNumber={currentPage * 2 + 1}
          content={leftPage.content}
          code={leftPage.code}
          diagram={leftPage.diagram}
          isRight={false}
          flipProgress={flipProg}
          wordIndex={wordIndex}
        />
      )}

      {rightPage && (
        <>
          {/* Subtle page shadow on the right while flipping */}
          <mesh position={[1.55, 0, -0.02]} rotation={[0, 0.02, 0]}>
            <planeGeometry args={[3.05, 4.25]} />
            <meshBasicMaterial
              color="#1A1A2E"
              transparent
              opacity={isFlipping ? 0.28 : 0.1}
            />
          </mesh>
          <Page
            pageNumber={currentPage * 2 + 2}
            content={rightPage.content}
            code={rightPage.code}
            diagram={rightPage.diagram}
            isRight={true}
            flipProgress={flipProg}
            wordIndex={wordIndex}
          />
        </>
      )}
    </group>
  );
}

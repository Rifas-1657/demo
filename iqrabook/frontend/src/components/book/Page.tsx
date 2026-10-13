// @ts-nocheck
"use client";

import { Html } from "@react-three/drei";
import { animated, SpringValue } from "@react-spring/three";
import { PageContent } from "@/components/book/PageContent";

interface PageProps {
  pageNumber: number;
  content: string;
  code?: string;
  diagram?: string;
  language?: string;
  isRight: boolean;
  flipProgress: SpringValue<number>;
  wordIndex?: number;
}

/**
 * 3D book page — hinged at the spine, Html overlay for lesson text.
 */
export function Page({
  pageNumber,
  content,
  code,
  diagram,
  language = "python",
  isRight,
  flipProgress,
  wordIndex = -1,
}: PageProps) {
  const sign = isRight ? 1 : -1;

  return (
    <animated.group
      position={[sign * 1.58, 0, 0.03]}
      rotation-y={flipProgress.to((p) => (isRight ? -p * 0.08 : p * 0.08))}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.05, 4.2, 0.02]} />
        <meshStandardMaterial color="#FFF8F0" roughness={0.72} />
      </mesh>

      <Html
        transform
        occlude={false}
        position={[0, 0.08, 0.02]}
        distanceFactor={8.4}
        zIndexRange={[2, 12]}
        style={{ pointerEvents: "auto" }}
      >
        <div
          style={{
            width: "280px",
            height: "390px",
            overflow: "hidden",
            background: "#FFFDF5",
            borderRadius: "3px",
            userSelect: "none",
            boxShadow: "inset 0 0 0 1px rgba(212,165,116,0.28)",
          }}
        >
          <PageContent
            text={content}
            code={code}
            diagram={diagram}
            language={language}
            wordIndex={wordIndex}
            isCodeStreaming={!!code && wordIndex >= 0}
          />
        </div>
      </Html>

      <Html position={[sign * 1.2, -1.95, 0.03]} center zIndexRange={[1, 4]}>
        <div
          style={{
            fontSize: "10px",
            color: "#BBA080",
            fontFamily: "serif",
            userSelect: "none",
          }}
        >
          {pageNumber}
        </div>
      </Html>
    </animated.group>
  );
}

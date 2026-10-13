'use client'

import { Float, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Book3DProps } from './types'

function makeCoverTexture(title: string, author: string, cover: Book3DProps['cover']) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 683
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = cover.base
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const glow = ctx.createRadialGradient(440, 60, 10, 440, 60, 360)
  glow.addColorStop(0, cover.accent)
  glow.addColorStop(1, 'transparent')
  ctx.globalAlpha = 0.45
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.globalAlpha = 1
  ctx.fillStyle = cover.spine
  ctx.fillRect(0, 0, 34, canvas.height)
  ctx.fillStyle = cover.text
  ctx.font = '600 22px ui-monospace, monospace'
  ctx.fillText('BOOKEY', 72, 90)
  ctx.font = '700 52px system-ui, sans-serif'
  const words = title.split(' ')
  let line = ''
  let y = 470
  const lines: string[] = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > 390 && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  lines.push(line)
  y -= (lines.length - 1) * 58
  for (const l of lines) {
    ctx.fillText(l, 72, y)
    y += 58
  }
  ctx.globalAlpha = 0.8
  ctx.font = '400 24px system-ui, sans-serif'
  ctx.fillText(author, 72, y + 18)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function BookMesh({ title, author, cover, interactive }: Book3DProps) {
  const group = useRef<THREE.Group>(null)
  const texture = useMemo(() => makeCoverTexture(title, author, cover), [title, author, cover])

  useFrame((state) => {
    if (!group.current || !interactive) return
    const targetY = -0.35 + state.pointer.x * 0.35
    const targetX = 0.08 - state.pointer.y * 0.15
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.06)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.06)
  })

  return (
    <group ref={group} rotation={[0.08, -0.35, 0]}>
      <RoundedBox args={[2.1, 2.8, 0.36]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color={cover.base} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0.04, 0, 0]}>
        <boxGeometry args={[2.02, 2.72, 0.34]} />
        <meshStandardMaterial color="#FBF6EE" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.181]}>
        <planeGeometry args={[2.1, 2.8]} />
        <meshStandardMaterial map={texture ?? undefined} color={texture ? '#ffffff' : cover.base} roughness={0.5} />
      </mesh>
    </group>
  )
}

export default function BookScene(props: Book3DProps & { active: boolean }) {
  const { active, interactive, ...rest } = props
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#FB7185" />
      {interactive ? (
        <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.5}>
          <BookMesh {...rest} interactive />
        </Float>
      ) : (
        <BookMesh {...rest} interactive={false} />
      )}
    </Canvas>
  )
}

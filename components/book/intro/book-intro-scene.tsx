'use client'

import { Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface BookIntroSceneProps {
  title: string
  subtitle?: string
  /** First rendered frame; the parent uses this to cancel its loading fallback. */
  onReady: () => void
  /** Timeline reached the hand-off point; the parent starts the cross-fade. */
  onComplete: () => void
  /** WebGL context lost or creation failed. */
  onError: () => void
}

const BOOK_W = 2.2
const BOOK_H = 3
const HINGE_X = -BOOK_W / 2
const FAN_PAGES = 9
const COMPLETE_AT = 4.5

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const segment = (t: number, start: number, end: number) => clamp01((t - start) / (end - start))
const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2)
const easeOut = (v: number) => 1 - Math.pow(1 - v, 3)

function displayFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-bricolage').trim()
  return family || 'system-ui, sans-serif'
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

/** Colour map plus a matching bump map so the title reads as embossed under the spotlight. */
function makeCoverTextures(title: string, subtitle?: string) {
  const w = 768
  const h = 1048
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = bump.width = w
  color.height = bump.height = h
  const c = color.getContext('2d')
  const b = bump.getContext('2d')
  if (!c || !b) return null

  const base = c.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, '#fcd34d')
  base.addColorStop(0.55, '#f59e0b')
  base.addColorStop(1, '#d97706')
  c.fillStyle = base
  c.fillRect(0, 0, w, h)
  b.fillStyle = '#808080'
  b.fillRect(0, 0, w, h)

  const inset = 46
  for (const ctx of [c, b]) {
    ctx.lineWidth = 6
    ctx.strokeStyle = ctx === c ? 'rgba(124, 45, 18, 0.55)' : '#ffffff'
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
    ctx.lineWidth = 2
    ctx.strokeRect(inset + 16, inset + 16, w - (inset + 16) * 2, h - (inset + 16) * 2)
  }

  const family = displayFont()
  c.textAlign = b.textAlign = 'center'
  c.textBaseline = b.textBaseline = 'middle'

  c.font = b.font = `600 26px ${family}`
  c.fillStyle = 'rgba(124, 45, 18, 0.8)'
  c.fillText('B O O K E Y', w / 2, 150)
  b.fillStyle = '#e0e0e0'
  b.fillText('B O O K E Y', w / 2, 150)

  const fontSize = title.length > 28 ? 64 : 80
  c.font = b.font = `800 ${fontSize}px ${family}`
  const lines = wrapLines(c, title, w - inset * 2 - 80)
  const lineHeight = fontSize * 1.12
  let y = h / 2 - ((lines.length - 1) * lineHeight) / 2 - 20
  for (const line of lines) {
    c.fillStyle = 'rgba(255, 247, 214, 0.75)'
    c.fillText(line, w / 2 - 2, y - 2)
    c.fillStyle = 'rgba(124, 45, 18, 0.55)'
    c.fillText(line, w / 2 + 3, y + 3)
    c.fillStyle = '#92400e'
    c.fillText(line, w / 2, y)
    b.fillStyle = '#ffffff'
    b.fillText(line, w / 2, y)
    y += lineHeight
  }

  if (subtitle) {
    c.font = b.font = `500 30px ${family}`
    c.fillStyle = 'rgba(124, 45, 18, 0.75)'
    c.fillText(subtitle, w / 2, h - 170)
    b.fillStyle = '#d0d0d0'
    b.fillText(subtitle, w / 2, h - 170)
  }

  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const bumpMap = new THREE.CanvasTexture(bump)
  return { map, bumpMap }
}

function makeRadialTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeSweepTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 4
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.5, 'rgba(255,250,230,0.9)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 4)
  return new THREE.CanvasTexture(canvas)
}

function Book({ title, subtitle, onReady, onComplete }: Omit<BookIntroSceneProps, 'onError'>) {
  const camera = useThree((s) => s.camera)
  const root = useRef<THREE.Group>(null)
  const cover = useRef<THREE.Group>(null)
  const sweep = useRef<THREE.Mesh>(null)
  const pages = useRef<(THREE.Group | null)[]>([])
  const glow = useRef<THREE.Mesh>(null)
  const burst = useRef<THREE.PointLight>(null)
  const start = useRef<number | null>(null)
  const completed = useRef(false)

  const textures = useMemo(() => makeCoverTextures(title, subtitle), [title, subtitle])
  const glowTexture = useMemo(() => makeRadialTexture('rgba(255,214,140,1)', 'rgba(255,170,60,0)'), [])
  const sweepTexture = useMemo(() => makeSweepTexture(), [])
  const fanTargets = useMemo(
    () => Array.from({ length: FAN_PAGES }, (_, i) => -Math.PI * (0.96 - (i / (FAN_PAGES - 1)) * 0.8)),
    [],
  )

  useEffect(
    () => () => {
      textures?.map.dispose()
      textures?.bumpMap.dispose()
      glowTexture.dispose()
      sweepTexture.dispose()
    },
    [textures, glowTexture, sweepTexture],
  )

  useFrame((state) => {
    if (start.current === null) {
      start.current = state.clock.elapsedTime
      onReady()
    }
    const t = state.clock.elapsedTime - start.current

    const arrive = easeOut(segment(t, 0, 1.3))
    const open = easeInOut(segment(t, 1.1, 2.7))
    const fan = segment(t, 1.9, 3.6)
    const glowIn = easeInOut(segment(t, 2.9, 4.3))
    const push = easeInOut(segment(t, 2.6, 4.6))

    if (root.current) {
      root.current.position.y = (1 - arrive) * -0.6 + Math.sin(t * 1.3) * 0.05 * (1 - open)
      root.current.position.x = -HINGE_X * 0.92 * open
      root.current.rotation.y = THREE.MathUtils.lerp(-0.42, 0, open)
      root.current.rotation.x = THREE.MathUtils.lerp(0.12, -0.32, open)
    }
    if (cover.current) cover.current.rotation.y = -Math.PI * 0.97 * open
    if (sweep.current) {
      const s = segment(t, 0.35, 1.35)
      sweep.current.position.x = THREE.MathUtils.lerp(0.35, BOOK_W - 0.35, s)
      ;(sweep.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(s * Math.PI) * 0.55
    }
    pages.current.forEach((page, i) => {
      if (!page) return
      const local = easeOut(clamp01(fan * 1.6 - i * 0.07))
      page.rotation.y = fanTargets[i] * local
    })
    if (glow.current) {
      const scale = 0.6 + glowIn * 7
      glow.current.scale.set(scale, scale, 1)
      ;(glow.current.material as THREE.MeshBasicMaterial).opacity = glowIn * 0.95
    }
    if (burst.current) burst.current.intensity = glowIn * 45

    camera.position.set(0, THREE.MathUtils.lerp(0.4, 0.15, push), THREE.MathUtils.lerp(9.5, 6.2, arrive) - push * 2.4)
    camera.lookAt(0, 0, 0)

    if (!completed.current && t >= COMPLETE_AT) {
      completed.current = true
      onComplete()
    }
  })

  return (
    <group ref={root}>
      <mesh position={[0, 0, -0.22]} castShadow>
        <boxGeometry args={[BOOK_W, BOOK_H, 0.05]} />
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </mesh>
      <mesh position={[0.03, 0, -0.02]}>
        <boxGeometry args={[BOOK_W - 0.08, BOOK_H - 0.1, 0.36]} />
        <meshStandardMaterial color="#fbf3dc" roughness={0.95} />
      </mesh>
      <mesh position={[HINGE_X - 0.02, 0, -0.02]}>
        <boxGeometry args={[0.06, BOOK_H, 0.48]} />
        <meshStandardMaterial color="#92400e" roughness={0.55} />
      </mesh>

      {fanTargets.map((_, i) => (
        <group
          key={i}
          ref={(node: THREE.Group | null) => {
            pages.current[i] = node
          }}
          position={[HINGE_X + 0.01, 0, 0.165 + i * 0.002]}
        >
          <mesh position={[(BOOK_W - 0.1) / 2, 0, 0]}>
            <planeGeometry args={[BOOK_W - 0.1, BOOK_H - 0.12]} />
            <meshStandardMaterial color={i % 2 ? '#fffaf0' : '#fdf3dc'} roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      <group ref={cover} position={[HINGE_X, 0, 0.2]}>
        <mesh position={[BOOK_W / 2, 0, 0]}>
          <boxGeometry args={[BOOK_W, BOOK_H, 0.05]} />
          <meshStandardMaterial color="#d97706" roughness={0.55} />
        </mesh>
        <mesh position={[BOOK_W / 2, 0, 0.026]}>
          <planeGeometry args={[BOOK_W, BOOK_H]} />
          <meshStandardMaterial
            map={textures?.map}
            bumpMap={textures?.bumpMap}
            bumpScale={2.5}
            color={textures ? '#ffffff' : '#f59e0b'}
            roughness={0.42}
            metalness={0.15}
          />
        </mesh>
        <mesh position={[BOOK_W / 2, 0, -0.026]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[BOOK_W - 0.04, BOOK_H - 0.04]} />
          <meshStandardMaterial color="#fde68a" roughness={0.85} />
        </mesh>
        <mesh ref={sweep} position={[0.35, 0, 0.03]}>
          <planeGeometry args={[0.7, BOOK_H - 0.04]} />
          <meshBasicMaterial
            map={sweepTexture}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh ref={glow} position={[HINGE_X, 0, 0.6]} renderOrder={10}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <pointLight ref={burst} position={[HINGE_X, 0, 1.2]} color="#ffb547" intensity={0} distance={8} />
    </group>
  )
}

export default function BookIntroScene({ title, subtitle, onReady, onComplete, onError }: BookIntroSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 9.5], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', onError, { once: true })
      }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.25} color="#ffe4c4" />
      <spotLight position={[1.5, 5, 6]} angle={0.42} penumbra={0.75} intensity={140} color="#ffd9a0" decay={2} />
      <pointLight position={[-4, -2, 2]} intensity={10} color="#be123c" />
      <Sparkles count={70} scale={[9, 6, 4]} size={2.2} speed={0.25} opacity={0.55} color="#fcd9a0" />
      <Book title={title} subtitle={subtitle} onReady={onReady} onComplete={onComplete} />
    </Canvas>
  )
}

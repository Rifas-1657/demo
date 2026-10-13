'use client'

import { Sparkles } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const PAGE_W = 1.5
const PAGE_H = 2.05
const SEGMENTS = 32
const STACK = 6
const MAX_PARALLAX = 0.14
const FLIP_CYCLE = 9
const FLIP_DURATION = 2.4

/** Height of a resting page above the spine plane, t = 0 at the spine, 1 at the fore-edge. */
function restLift(t: number) {
  return 0.24 * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - 0.55 * t) + 0.02 * t
}

function restSlope(t: number) {
  const dt = 1 / SEGMENTS
  return Math.atan2(restLift(Math.min(1, t + dt)) - restLift(t), PAGE_W * dt)
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

type PageArt = 'heading' | 'diagram' | 'code' | 'lines'

function makePageTexture(art: PageArt, mirrored = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 700
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (mirrored) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  const paper = ctx.createLinearGradient(0, 0, canvas.width, 0)
  paper.addColorStop(0, '#F6EAD0')
  paper.addColorStop(0.12, '#FFFBEB')
  paper.addColorStop(1, '#FFF8E4')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const line = (y: number, w: number, color = 'rgba(41,32,19,0.22)', h = 9) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(70, y, w, h, h / 2)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(194,65,12,0.85)'
  ctx.font = '600 20px ui-monospace, monospace'
  ctx.fillText(art === 'code' ? 'TRY IT' : art === 'diagram' ? 'SEE IT' : 'CHAPTER 03', 70, 92)

  if (art === 'heading') {
    ctx.fillStyle = '#292013'
    ctx.font = '700 46px system-ui, sans-serif'
    ctx.fillText('Loops that', 70, 160)
    ctx.fillText('repeat for you', 70, 214)
    let y = 270
    for (let i = 0; i < 9; i++) {
      line(y, i % 4 === 3 ? 240 : 360)
      y += 30
    }
    ctx.fillStyle = 'rgba(250,204,21,0.55)'
    ctx.fillRect(66, 392, 250, 18)
    line(y + 20, 300)
    line(y + 50, 340)
  }

  if (art === 'diagram') {
    ctx.strokeStyle = 'rgba(194,65,12,0.85)'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    const node = (x: number, y: number, w: number) => {
      ctx.beginPath()
      ctx.roundRect(x, y, w, 56, 16)
      ctx.stroke()
    }
    node(150, 140, 210)
    node(150, 270, 210)
    node(150, 400, 210)
    ctx.beginPath()
    ctx.moveTo(255, 196)
    ctx.lineTo(255, 270)
    ctx.moveTo(255, 326)
    ctx.lineTo(255, 400)
    ctx.moveTo(360, 428)
    ctx.bezierCurveTo(440, 428, 440, 168, 360, 168)
    ctx.stroke()
    ctx.fillStyle = 'rgba(225,29,72,0.9)'
    ctx.beginPath()
    ctx.arc(255, 233, 9, 0, Math.PI * 2)
    ctx.fill()
    line(520, 340)
    line(550, 280)
    line(580, 320)
  }

  if (art === 'code') {
    ctx.fillStyle = '#292013'
    ctx.beginPath()
    ctx.roundRect(60, 130, 392, 210, 18)
    ctx.fill()
    const code = [
      ['#FB7185', 'for '],
      ['#FFFBEB', 'item '],
      ['#FB7185', 'in '],
      ['#FACC15', 'items:'],
    ]
    ctx.font = '500 26px ui-monospace, monospace'
    let x = 90
    for (const [color, text] of code) {
      ctx.fillStyle = color
      ctx.fillText(text, x, 190)
      x += ctx.measureText(text).width
    }
    ctx.fillStyle = '#FFFBEB'
    ctx.fillText('    print(item)', 90, 236)
    ctx.fillStyle = 'rgba(255,251,235,0.45)'
    ctx.fillText('> apple  mango', 90, 300)
    let y = 390
    for (let i = 0; i < 8; i++) {
      line(y, i % 3 === 2 ? 220 : 360)
      y += 30
    }
  }

  if (art === 'lines') {
    let y = 140
    for (let i = 0; i < 15; i++) {
      line(y, i % 5 === 4 ? 200 : 360)
      y += 30
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,200,120,0.95)')
  g.addColorStop(0.35, 'rgba(251,146,60,0.35)')
  g.addColorStop(1, 'rgba(251,113,133,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A curved resting page. side = 1 lies to the right of the spine, -1 to the left. */
function makeRestingPage(side: 1 | -1, liftScale: number) {
  const geometry = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS, 1)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getX(i) + PAGE_W / 2) / PAGE_W
    pos.setX(i, side * t * PAGE_W)
    pos.setZ(i, restLift(t) * liftScale)
  }
  if (side === -1) {
    // Mirroring flips winding; restore it so the texture faces up.
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
    if (geometry.index) (geometry.index.array as Uint16Array).reverse()
  }
  geometry.computeVertexNormals()
  return geometry
}

function TurningPage({ front, back, animate }: { front: THREE.Texture | null; back: THREE.Texture | null; animate: boolean }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS, 1), [])
  const slopes = useMemo(() => Array.from({ length: SEGMENTS + 1 }, (_, i) => restSlope(i / SEGMENTS)), [])
  const points = useMemo(() => new Float32Array((SEGMENTS + 1) * 2), [])

  useFrame((state) => {
    const time = state.clock.elapsedTime % (FLIP_CYCLE * 2)
    const half = time % FLIP_CYCLE
    const forward = time < FLIP_CYCLE
    const raw = animate ? Math.min(1, Math.max(0, (half - (FLIP_CYCLE - FLIP_DURATION - 1.2)) / FLIP_DURATION)) : 0
    const progress = forward ? easeInOut(raw) : 1 - easeInOut(raw)
    const theta = progress * Math.PI
    const curl = 0.9 * Math.sin(theta) * (forward ? 1 : -1)

    let x = 0
    let z = restLift(0) + 0.004
    const seg = PAGE_W / SEGMENTS
    points[0] = x
    points[1] = z
    for (let i = 1; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS
      const alpha = slopes[i - 1]
      const phi = alpha + (Math.PI - 2 * alpha) * progress - curl * t
      x += Math.cos(phi) * seg
      z += Math.sin(phi) * seg
      points[i * 2] = x
      points[i * 2 + 1] = z + 0.004 * Math.sin(theta)
    }

    const pos = geometry.attributes.position
    for (let v = 0; v < pos.count; v++) {
      const i = v % (SEGMENTS + 1)
      pos.setX(v, points[i * 2])
      pos.setZ(v, points[i * 2 + 1])
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial map={front ?? undefined} color="#ffffff" roughness={0.85} side={THREE.FrontSide} emissive="#F59E0B" emissiveIntensity={0.05} />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial map={back ?? undefined} color="#ffffff" roughness={0.85} side={THREE.BackSide} emissive="#F59E0B" emissiveIntensity={0.05} />
      </mesh>
    </group>
  )
}

function OpenBook({ animate, pointer }: { animate: boolean; pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)

  const textures = useMemo(
    () => ({
      left: makePageTexture('heading'),
      under: makePageTexture('code'),
      front: makePageTexture('diagram'),
      back: makePageTexture('lines', true),
      glow: makeGlowTexture(),
    }),
    [],
  )

  const stacks = useMemo(
    () =>
      ([1, -1] as const).map((side) =>
        Array.from({ length: STACK }, (_, i) => ({
          geometry: makeRestingPage(side, 1 - i * 0.07),
          z: -i * 0.016,
          key: `${side}-${i}`,
          side,
          top: i === 0,
        })),
      ),
    [],
  )

  useEffect(
    () => () => {
      for (const texture of Object.values(textures)) texture?.dispose()
      for (const stack of stacks) for (const page of stack) page.geometry.dispose()
    },
    [textures, stacks],
  )

  useFrame((state) => {
    if (!group.current) return
    const p = pointer.current
    const targetY = animate ? THREE.MathUtils.clamp(p.x * MAX_PARALLAX, -MAX_PARALLAX, MAX_PARALLAX) : 0
    const targetX = animate ? THREE.MathUtils.clamp(-p.y * MAX_PARALLAX * 0.6, -MAX_PARALLAX, MAX_PARALLAX) : 0
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -0.22 + targetY, 0.05)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -1.02 + targetX, 0.05)
    if (animate) group.current.position.y = -0.15 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    if (glow.current) {
      const material = glow.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 1.3) * (animate ? 0.12 : 0)
    }
  })

  return (
    <group ref={group} rotation={[-1.02, 0, -0.22]} position={[0, -0.15, 0]}>
      {/* Cover boards */}
      {([1, -1] as const).map((side) => (
        <mesh key={side} position={[side * (PAGE_W / 2 + 0.03), 0, -0.13]} rotation={[0, side * -0.04, 0]}>
          <boxGeometry args={[PAGE_W + 0.1, PAGE_H + 0.14, 0.05]} />
          <meshStandardMaterial color="#5B0F1F" roughness={0.6} metalness={0.05} />
        </mesh>
      ))}
      {/* Spine */}
      <mesh position={[0, 0, -0.14]}>
        <cylinderGeometry args={[0.08, 0.08, PAGE_H + 0.14, 24, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#3B0A14" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Page block edges */}
      {([1, -1] as const).map((side) => (
        <mesh key={`block-${side}`} position={[side * (PAGE_W / 2), 0, -0.06]}>
          <boxGeometry args={[PAGE_W - 0.02, PAGE_H - 0.02, 0.1]} />
          <meshStandardMaterial color="#F3E6C8" roughness={0.95} />
        </mesh>
      ))}

      {stacks.flat().map((page) => (
        <mesh key={page.key} geometry={page.geometry} position={[0, 0, page.z]}>
          <meshStandardMaterial
            map={page.top ? ((page.side === 1 ? textures.under : textures.left) ?? undefined) : undefined}
            color={page.top ? '#ffffff' : '#F8EED6'}
            roughness={0.9}
            emissive="#F59E0B"
            emissiveIntensity={page.top ? 0.05 : 0.02}
          />
        </mesh>
      ))}

      <TurningPage front={textures.front} back={textures.back} animate={animate} />

      {/* Warm inner glow rising from the gutter */}
      <mesh ref={glow} position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 2.4]} />
        <meshBasicMaterial map={textures.glow ?? undefined} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0, 0, 0.9]} intensity={3.2} distance={4} color="#FDBA74" />
    </group>
  )
}

export default function OpenBookScene({ active, animate }: { active: boolean; animate: boolean }) {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!animate) return
    function onMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [animate])

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0.35, 5.6], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.35} color="#FFE4E6" />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} color="#FFF1E0" />
      <pointLight position={[-3.5, 1.5, 2]} intensity={14} color="#FB7185" />
      <pointLight position={[3.5, -1, 2.5]} intensity={10} color="#F59E0B" />
      <OpenBook animate={animate} pointer={pointer} />
      <Sparkles count={70} scale={[6, 4, 3]} size={2.4} speed={animate ? 0.3 : 0} opacity={0.75} color="#FDBA74" noise={0.6} />
      <Sparkles count={40} scale={[7, 4.5, 3]} size={1.8} speed={animate ? 0.22 : 0} opacity={0.55} color="#FB7185" noise={0.8} />
    </Canvas>
  )
}

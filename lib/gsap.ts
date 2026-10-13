'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * GSAP is reserved for selected marketing scroll scenes. Always wrap scenes in
 * `gsap.matchMedia()` with MOTION_OK so reduced-motion and touch users get the
 * static layout. Never pin/hijack scroll for core content.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export const MOTION_OK = '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)'

export { gsap, ScrollTrigger, useGSAP }

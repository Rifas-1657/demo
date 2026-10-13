'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { GrainOverlay } from '@/components/ui-kit/grain-overlay'
import { MagneticButton } from '@/components/ui-kit/magnetic-button'
import { easeOutExpo } from '@/lib/motion'
import { ROUTES } from '../data'
import { HeroVisual } from './hero-visual'

const LINES = [
  { text: 'Don\u2019t just watch.', className: 'text-[#FFF1F3]/55' },
  { text: 'Step inside', className: 'text-[#FFF1F3]' },
  { text: 'the knowledge.', className: 'text-[#FFF1F3]', accent: true },
]

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="theme-night relative isolate flex min-h-dvh flex-col overflow-hidden bg-night-gradient pt-28 pb-12 sm:pt-32 lg:justify-center lg:pt-24"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_75%_45%,rgb(225_29_72/0.22),transparent_70%),radial-gradient(40%_40%_at_10%_100%,rgb(245_158_11/0.12),transparent_70%)]" />
      <GrainOverlay opacity={0.07} className="-z-10 mix-blend-overlay" />

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-0">
        <div className="relative z-10 lg:col-span-7">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeOutExpo }}
            className="inline-flex items-center gap-3 font-mono text-xs tracking-[0.24em] text-brand-pink uppercase"
          >
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            Learning that comes alive
          </motion.p>

          <h1
            id="hero-title"
            className="mt-6 font-display text-[clamp(3rem,8.2vw,7.75rem)] leading-[0.9] font-semibold tracking-[-0.045em]"
          >
            {LINES.map((line, i) => (
              <span key={line.text} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className={`inline-block ${line.className}`}
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.1, ease: easeOutExpo, delay: 0.15 + i * 0.12 }}
                >
                  {line.accent ? (
                    <>
                      the{' '}
                      <span className="relative inline-block bg-[linear-gradient(100deg,#FB7185_10%,#FDBA74_90%)] bg-clip-text text-transparent">
                        knowledge.
                        <svg aria-hidden="true" viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-[0.06em] left-0 h-[0.14em] w-full overflow-visible">
                          <motion.path
                            d="M2 14 C 80 4, 200 4, 298 12"
                            fill="none"
                            stroke="#FACC15"
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: easeOutExpo, delay: 1 }}
                          />
                        </svg>
                      </span>
                    </>
                  ) : (
                    line.text
                  )}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: easeOutExpo, delay: 0.6 }}
          >
            <p className="mt-8 max-w-xl text-pretty text-base leading-relaxed text-[#FFF1F3]/72 sm:text-lg">
              Turn long videos and conversations into living books—with a voice tutor, diagrams that draw as you learn,
              and code you can try yourself.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <MagneticButton size="lg" nativeButton={false} render={<Link href={ROUTES.signup} />}>
                Open your first book
                <ArrowRight aria-hidden="true" />
              </MagneticButton>
              <BookeyButton
                size="lg"
                variant="ghost"
                nativeButton={false}
                render={<Link href="#experience" />}
                className="text-[#FFF1F3] hover:bg-white/8"
              >
                Explore the experience
                <ArrowDown aria-hidden="true" />
              </BookeyButton>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="relative aspect-square w-full max-lg:-mt-2 max-lg:max-h-[70vh] lg:absolute lg:top-1/2 lg:right-[-6%] lg:aspect-auto lg:h-[min(92vh,880px)] lg:w-[62%] lg:-translate-y-1/2"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: easeOutExpo, delay: 0.2 }}
        >
          <HeroVisual className="size-full" />
        </motion.div>
      </div>
    </section>
  )
}

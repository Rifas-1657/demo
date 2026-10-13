'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { SectionLabel } from '@/components/ui-kit/section-label'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { FAQS } from './data'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  const baseId = useId()

  return (
    <section aria-labelledby="faq-title" className="bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <SectionLabel index="08">FAQ</SectionLabel>
          <h2 id="faq-title" className="mt-5 text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
            Questions, answered.
          </h2>
        </div>
        <ul className="divide-y divide-border border-y border-border">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            const buttonId = `${baseId}-q-${i}`
            const panelId = `${baseId}-a-${i}`
            return (
              <li key={item.q}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold focus-visible:text-primary focus-visible:outline-none sm:text-xl"
                  >
                    {item.q}
                    <Plus aria-hidden="true" className={cn('size-5 shrink-0 text-primary transition-transform duration-300', isOpen && 'rotate-45')} />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: easeOutExpo }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface AccordionItem {
  q: string
  a: React.ReactNode
  meta?: string
}

interface AccordionListProps {
  items: AccordionItem[]
  defaultOpen?: number | null
  className?: string
}

export function AccordionList({ items, defaultOpen = null, className }: AccordionListProps) {
  const [open, setOpen] = useState<string | null>(defaultOpen === null ? null : (items[defaultOpen]?.q ?? null))
  const baseId = useId()

  return (
    <ul className={cn('divide-y divide-border border-y border-border', className)}>
      {items.map((item, i) => {
        const isOpen = open === item.q
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
                onClick={() => setOpen(isOpen ? null : item.q)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left focus-visible:outline-none"
              >
                <span>
                  {item.meta && (
                    <span className="mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                      {item.meta}
                    </span>
                  )}
                  <span className="text-lg font-semibold group-hover:text-primary group-focus-visible:text-primary sm:text-xl">
                    {item.q}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-primary transition-[transform,background-color] duration-300',
                    isOpen && 'rotate-45 bg-secondary',
                  )}
                >
                  <Plus className="size-4" />
                </span>
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
                  <div className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{item.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}

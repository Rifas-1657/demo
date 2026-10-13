'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Minus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ROUTES } from '@/components/landing/data'
import { BookeyBadge } from '@/components/ui-kit/bookey-badge'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { easeOutExpo } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Billing = 'monthly' | 'yearly'

const PLANS = [
  {
    id: 'demo',
    name: 'Free Demo',
    blurb: 'Explore the sample book and every reader feature.',
    price: { monthly: 0, yearly: 0 },
    cta: { label: 'Open demo course', href: ROUTES.demoCourse },
    featured: false,
    features: [
      ['Python from Zero demo book', true],
      ['Narration, diagrams, and code practice', true],
      ['Notes and bookmarks in this browser', true],
      ['Generate books from your sources', false],
    ],
  },
  {
    id: 'learner',
    name: 'Learner',
    blurb: 'For people turning their own learning backlog into books.',
    price: { monthly: 12, yearly: 9 },
    cta: { label: 'Create an account', href: ROUTES.signup },
    featured: true,
    features: [
      ['Up to 10 generated books a month', true],
      ['Sources up to 3 hours each', true],
      ['Tutor with source-cited answers', true],
      ['Personalized depth and pace', true],
    ],
  },
  {
    id: 'creator',
    name: 'Creator / Owner',
    blurb: 'For educators publishing books from their own courses.',
    price: { monthly: 29, yearly: 24 },
    cta: { label: 'Create an account', href: ROUTES.signup },
    featured: false,
    features: [
      ['Everything in Learner', true],
      ['Publish and share books with learners', true],
      ['Edit chapters, pages, and practice', true],
      ['Learner progress overview', true],
    ],
  },
] as const

export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <div>
      <div className="flex flex-col items-center gap-3">
        <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full border border-border bg-card p-1">
          {(['monthly', 'yearly'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={billing === option}
              onClick={() => setBilling(option)}
              className={cn(
                'relative rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none',
                billing === option ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {billing === option && (
                <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ duration: 0.4, ease: easeOutExpo }} />
              )}
              <span className="relative">{option}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Yearly shows the example price per month, billed annually.</p>
      </div>

      <ul className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {PLANS.map((plan) => {
          const price = plan.price[billing]
          return (
            <li
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-[1.75rem] border p-7 sm:p-8',
                plan.featured
                  ? 'theme-night border-white/10 bg-night-gradient text-[#FFF1F3] shadow-[0_40px_80px_-40px_rgb(159_18_57/0.7)]'
                  : 'border-border bg-card',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {plan.featured && <BookeyBadge tone="brand">Most popular</BookeyBadge>}
              </div>
              <p className={cn('mt-2 text-sm leading-relaxed', plan.featured ? 'text-[#FFF1F3]/70' : 'text-muted-foreground')}>{plan.blurb}</p>

              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-6xl leading-none font-semibold tracking-tight tabular-nums">
                  $
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={price}
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -16, opacity: 0 }}
                      transition={{ duration: 0.35, ease: easeOutExpo }}
                      className="inline-block"
                    >
                      {price}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className={cn('pb-1.5 text-sm', plan.featured ? 'text-[#FFF1F3]/60' : 'text-muted-foreground')}>
                  {price === 0 ? 'always' : '/ month · example'}
                </span>
              </div>

              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {plan.features.map(([label, included]) => (
                  <li key={label} className={cn('flex gap-3', !included && 'opacity-55')}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                        plan.featured ? 'bg-white/10 text-brand-pink' : 'bg-secondary text-primary',
                      )}
                    >
                      {included ? <Check className="size-3" /> : <Minus className="size-3" />}
                    </span>
                    <span>
                      {label}
                      {!included && <span className="sr-only"> (not included)</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <BookeyButton
                size="lg"
                variant={plan.featured ? 'primary' : 'outline'}
                className="mt-9 w-full"
                nativeButton={false}
                render={<Link href={plan.cta.href} />}
              >
                {plan.cta.label}
                <ArrowRight aria-hidden="true" />
              </BookeyButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

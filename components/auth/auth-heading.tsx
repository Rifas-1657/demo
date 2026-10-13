interface AuthHeadingProps {
  eyebrow: string
  title: string
  description: string
}

export function AuthHeading({ eyebrow, title, description }: AuthHeadingProps) {
  return (
    <div className="mb-8">
      <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 leading-relaxed text-ink-muted">{description}</p>
    </div>
  )
}

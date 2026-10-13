import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const bookeyButtonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ease-out outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/30 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--primary)_80%,transparent)] hover:bg-[color-mix(in_oklab,var(--primary)_88%,black)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary)_85%,var(--primary))]',
        outline: 'border border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        dark: 'bg-ink text-[#FFF1F3] hover:bg-night',
        link: 'h-auto rounded-none px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        icon: 'size-10',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type BookeyButtonProps = ButtonPrimitive.Props & VariantProps<typeof bookeyButtonVariants>

/**
 * Bookey button. For links, pass `render={<Link href="..." />}` and
 * `nativeButton={false}`.
 */
export function BookeyButton({ className, variant, size, ...props }: BookeyButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="bookey-button"
      className={cn(bookeyButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

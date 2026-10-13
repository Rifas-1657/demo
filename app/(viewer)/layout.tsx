/** Immersive reader: no site or workspace chrome. */
export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>
}

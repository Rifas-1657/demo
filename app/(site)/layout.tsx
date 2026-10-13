import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingHeader } from '@/components/landing/landing-header'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingHeader />
      <main id="main" className="overflow-x-clip">
        {children}
      </main>
      <LandingFooter />
    </>
  )
}

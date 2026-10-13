'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SEARCH_INPUT_ID } from '@/components/search/search-experience'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { Hint } from '@/components/ui-kit/hint'
import { addRecentSearch } from '@/lib/stores/library'

export function GlobalSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const onSearchPage = pathname === '/search'
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const target = document.getElementById(SEARCH_INPUT_ID) ?? inputRef.current
        if (target instanceof HTMLInputElement && target.offsetParent !== null) {
          target.focus()
          target.select()
        } else {
          router.push('/search')
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  // The search page has its own full-width field; avoid two competing inputs.
  if (onSearchPage) return null

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = value.trim()
          if (trimmed) addRecentSearch(trimmed)
          router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
          setValue('')
          inputRef.current?.blur()
        }}
        className="relative hidden md:block"
      >
        <label htmlFor="topbar-search" className="sr-only">
          Search courses, chapters, and notes
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id="topbar-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search Bookey"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          className="peer h-10 w-64 rounded-full border border-border bg-card pr-16 pl-10 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/30 xl:w-80 [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground peer-focus-visible:opacity-0"
        >
          Ctrl K
        </kbd>
      </form>
      <Hint label="Search">
        <BookeyButton size="icon" variant="ghost" aria-label="Search" className="md:hidden" nativeButton={false} render={<Link href="/search" />}>
          <Search aria-hidden="true" />
        </BookeyButton>
      </Hint>
    </>
  )
}

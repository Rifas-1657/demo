// Reusable QA runner. Usage:
//   node qa/run.mjs routes [--base http://localhost:4100] [--only /path,/other]
// Visits every route at 3 viewports, collects console errors/warnings, page errors,
// failed requests, horizontal overflow, placeholder text, and writes screenshots.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const BASE = process.env.QA_BASE ?? 'http://localhost:4100'
export const SHOTS = path.join(here, 'shots')
export const RESULTS = path.join(here, 'results')
fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync(RESULTS, { recursive: true })

export const GPU_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
]
export const NO_WEBGL_ARGS = ['--disable-gpu', '--disable-webgl', '--disable-webgl2', '--disable-3d-apis']

export const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
]

export const ROUTES = [
  '/',
  '/features',
  '/how-it-works',
  '/pricing',
  '/about',
  '/faq',
  '/privacy',
  '/terms',
  '/design-system',
  '/login',
  '/signup',
  '/forgot-password',
  '/dashboard',
  '/courses',
  '/courses/python',
  '/courses/java',
  '/courses/machine-learning',
  '/courses/web-development',
  '/courses/python/survey',
  '/book/python',
  '/library',
  '/search',
  '/progress',
  '/profile',
  '/settings',
  '/notifications',
  '/admin',
  '/admin/courses',
  '/admin/courses/new',
  '/admin/courses/course_python/edit',
  '/admin/knowledge-base',
  '/admin/members',
  '/admin/tutor-settings',
  '/this-route-does-not-exist',
  '/courses/not-a-course',
  '/book/not-a-book',
  '/admin/courses/not-a-course/edit',
]

const BANNED_TEXT = [/lorem ipsum/i, /placeholder/i, /the focus engine/i, /\bTODO\b/, /undefined/, /\[object Object\]/, /NaN/]

// Known, environmental noise. Reported in REPORT.md as "ignored", never silently dropped:
//  - /_vercel/insights|speed-insights 404: Vercel Analytics script only exists when hosted on Vercel.
//  - THREE.Clock deprecation: emitted by three.js / @react-three/fiber internals, not app code.
const NOISE = [/_vercel\/(insights|speed-insights)/, /THREE\.Clock: This module has been deprecated/]
export const ignored = new Set()
const isNoise = (s) => NOISE.some((re) => re.test(s))

export function attachCollectors(page, bucket) {
  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      const text = msg.text().slice(0, 400)
      const url = msg.location()?.url ?? ''
      if (isNoise(text) || isNoise(url)) return ignored.add(text.slice(0, 120))
      bucket.console.push({ type, text, url })
    }
  })
  page.on('pageerror', (err) => bucket.pageErrors.push(String(err.message ?? err).slice(0, 400)))
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? ''
    if (failure.includes('ERR_ABORTED')) return
    bucket.failedRequests.push(`${req.method()} ${req.url()} ${failure}`)
  })
  page.on('response', (res) => {
    if (res.status() >= 400 && !isNoise(res.url())) bucket.badResponses.push(`${res.status()} ${res.url()}`)
  })
}

export async function loadAdminDemo(page) {
  // Demo admin is a client-side navigation state; enter it via the real UI.
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  const enter = page.getByRole('button', { name: /enter demo admin/i })
  if (await enter.count()) await enter.first().click()
  await page.waitForTimeout(300)
}

export async function overflowReport(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const vw = window.innerWidth
    const offenders = []
    if (doc.scrollWidth > vw + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
          const cs = getComputedStyle(el)
          let clipped = false
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX
            if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') {
              clipped = true
              break
            }
          }
          if (!clipped && cs.display !== 'none') {
            offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`)
          }
          if (offenders.length >= 4) break
        }
      }
    }
    return { scrollWidth: doc.scrollWidth, viewport: vw, overflow: doc.scrollWidth > vw + 1, offenders }
  })
}

export function slug(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_')
}

async function runRoutes(only) {
  const browser = await chromium.launch({ args: GPU_ARGS })
  const results = []
  const routes = only?.length ? only : ROUTES
  for (const route of routes) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      const bucket = { console: [], pageErrors: [], failedRequests: [], badResponses: [] }
      attachCollectors(page, bucket)
      const row = { route, viewport: vp.name, status: null, title: '', h1: '', overflow: null, banned: [], notes: [] }
      try {
        if (route.startsWith('/admin')) {
          await loadAdminDemo(page)
          bucket.console.length = 0
          bucket.pageErrors.length = 0
          bucket.badResponses.length = 0
        }
        // The book intro is covered by the 3D suite; pre-mark it seen so route tests see the reader.
        await page.addInitScript(() => {
          try {
            sessionStorage.setItem('bookey:intro-seen:python', '1')
          } catch {}
        })
        const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 })
        row.status = res?.status() ?? null
        await page.waitForTimeout(700)
        row.title = await page.title()
        row.h1 = (await page.locator('h1').first().textContent({ timeout: 1500 }).catch(() => '')) ?? ''
        row.overflow = await overflowReport(page)
        const text = await page.evaluate(() => document.body.innerText)
        for (const re of BANNED_TEXT) {
          const m = text.match(re)
          if (m) row.banned.push(m[0])
        }
        // keyboard focus: first Tab must land on something visible
        await page.keyboard.press('Tab')
        row.focus = await page.evaluate(() => {
          const el = document.activeElement
          if (!el || el === document.body) return 'none'
          const r = el.getBoundingClientRect()
          return `${el.tagName.toLowerCase()}${r.width > 0 ? '' : ' (zero-size)'}`
        })
        await page.screenshot({ path: path.join(SHOTS, `${slug(route)}__${vp.name}.png`), fullPage: false })
      } catch (err) {
        row.notes.push(`navigation error: ${String(err.message).split('\n')[0]}`)
      }
      Object.assign(row, bucket)
      results.push(row)
      await ctx.close()
      const bad = row.pageErrors.length + row.console.length + row.failedRequests.length + row.badResponses.length
      process.stdout.write(
        `${row.status ?? '---'} ${route} @${vp.name} consoleIssues=${row.console.length} pageErrors=${row.pageErrors.length} net=${row.failedRequests.length + row.badResponses.length} overflow=${row.overflow?.overflow ?? '?'} banned=${row.banned.join(',') || '-'}${bad ? '  <<<' : ''}\n`,
      )
    }
  }
  await browser.close()
  fs.writeFileSync(path.join(RESULTS, 'routes.json'), JSON.stringify(results, null, 2))
  return results
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2)
  const onlyIdx = rest.indexOf('--only')
  const only = onlyIdx >= 0 ? rest[onlyIdx + 1].split(',') : undefined
  if (cmd === 'routes' || !cmd) {
    await runRoutes(only)
  } else {
    console.error('unknown command', cmd)
    process.exit(1)
  }
}

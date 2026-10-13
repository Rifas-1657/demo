import { chromium } from 'playwright'
import { BASE, GPU_ARGS, loadAdminDemo } from './run.mjs'
const targets = [['/library',375],['/notifications',375],['/admin/courses',768],['/admin/knowledge-base',768],['/admin/members',768]]
const b = await chromium.launch({ args: GPU_ARGS })
for (const [route, w] of targets) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } })
  const page = await ctx.newPage()
  if (route.startsWith('/admin')) await loadAdminDemo(page)
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const out = await page.evaluate(() => {
    const vw = window.innerWidth
    const res = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 && r.width > 0) {
        res.push(`${el.tagName.toLowerCase()} .${String(el.className).replace(/\s+/g,'.').slice(0,70)} w=${Math.round(r.width)} right=${Math.round(r.right)} parent=${el.parentElement?.tagName.toLowerCase()}`)
      }
    }
    return { sw: document.documentElement.scrollWidth, bodySw: document.body.scrollWidth, first: res.slice(0, 8), count: res.length }
  })
  console.log(route, w, JSON.stringify(out, null, 1))
  await ctx.close()
}
await b.close()

import { chromium } from 'playwright'
import { BASE, GPU_ARGS } from './run.mjs'
const b = await chromium.launch({ args: GPU_ARGS })
const page = await (await b.newContext({ viewport: { width: 375, height: 900 } })).newPage()
await page.goto(BASE + '/library', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
console.log(await page.evaluate(() => {
  const vw = innerWidth, out = []
  const li = [...document.querySelectorAll('li')].find(l => l.getBoundingClientRect().right > vw + 1)
  let el = li
  while (el && el !== document.body) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
    out.push(`${el.tagName.toLowerCase()} w=${Math.round(r.width)} disp=${cs.display} min-w=${cs.minWidth} cls=${String(el.className).slice(0, 90)}`)
    el = el.parentElement
  }
  return out.join('\n')
}))
await b.close()

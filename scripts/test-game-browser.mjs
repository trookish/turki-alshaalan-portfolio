// Real-browser acceptance checks. Start Vite on 4173 and Chrome CDP on 9222.
import assert from 'node:assert/strict'
import { writeFile, mkdir } from 'node:fs/promises'
const endpoint = process.env.CDP_URL || 'http://127.0.0.1:9222'
const base = process.env.GAME_URL || 'http://127.0.0.1:4173/'
const output = process.env.GAME_SHOTS || `${process.env.TMPDIR || '.'}/souls-shots`
await mkdir(output, { recursive: true })
const target = await (await fetch(`${endpoint}/json/new?${encodeURIComponent(base)}`, { method: 'PUT' })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let seq = 0
const pending = new Map()
const errors = []
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data)
  if (msg.id) {
    const call = pending.get(msg.id)
    if (!call) return
    pending.delete(msg.id)
    clearTimeout(call.timer)
    msg.error ? call.reject(new Error(JSON.stringify(msg.error))) : call.resolve(msg.result)
  } else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails)
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 20000)
  pending.set(id, { resolve, reject, timer })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const until = async (expression, timeout = 15000) => {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return
    await sleep(100)
  }
  throw new Error(`Timed out: ${expression}`)
}
const shot = async (name) => {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(`${output}/${name}.png`, Buffer.from(result.data, 'base64'))
}
const key = async (key) => {
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)} }))`)
  await sleep(60)
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keyup', { key: ${JSON.stringify(key)} }))`)
}
try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: base })
  await until(`!!document.querySelector('.play-btn')`)
  await evaluate(`document.querySelector('.play-btn').click()`)
  await until(`!!document.querySelector('.game-hud')`)
  await shot('desktop-before')
  assert.ok(await evaluate(`!!document.querySelector('.game-intro')`), 'Game must explain the challenge and wait for Begin before combat')
  console.log('PASS: deliberate encounter start')

  // Begin the fight and let the countdown resolve.
  await evaluate(`document.querySelector('.game-intro .game-primary').click()`)
  await until(`!document.querySelector('.game-intro')`)
  await sleep(3600)
  assert.ok(await evaluate(`!!document.querySelector('.hud-boss.visible')`), 'Boss bar must be visible during the fight')
  assert.ok(await evaluate(`(document.querySelector('.hud-phase')?.textContent || '').length > 0`), 'Phase line must label the encounter')
  assert.ok(await evaluate(`document.querySelector('.hud-lock')?.style.display === 'block'`), 'Lock-on marker must anchor on the boss')
  assert.ok(await evaluate(`(document.querySelector('.hud-boss-name')?.textContent || '').length > 0`), 'Boss needs a name')
  console.log('PASS: fight HUD (boss bar, poise, phase, lock-on)')

  // Some real input so the shot shows combat motion.
  await key('j'); await sleep(150); await key('j'); await sleep(250)
  await key(' ')
  await sleep(120)
  await shot('desktop-fight')
  console.log('PASS: desktop fight renders')

  // Pause overlay must be real controls.
  await evaluate(`document.querySelector('.pause-toggle').click()`)
  await until(`!!document.querySelector('.game-paused')`)
  await shot('desktop-paused')
  await evaluate(`document.querySelector('.game-paused .game-primary').click()`)
  await until(`!document.querySelector('.game-paused')`)
  console.log('PASS: pause and resume')

  // Mobile layout: touch controls active and comfortably sized.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await evaluate(`[...document.querySelectorAll('.control-toggle')].find((b) => b.textContent.trim() === 'Mobile').click()`)
  await until(`!!document.querySelector('.mobile-controls.active')`)
  await sleep(400)
  const sizes = await evaluate(`[...document.querySelectorAll('.souls-btn, .joystick-zone')].map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })`)
  assert.ok(sizes.length >= 6, 'Joystick plus five action buttons must exist')
  assert.ok(sizes.every(([w, h]) => w >= 44 && h >= 44), `Touch targets too small: ${JSON.stringify(sizes)}`)
  await shot('mobile-fight')
  console.log('PASS: mobile touch controls', JSON.stringify(sizes))

  // Portrait sanity after closing the modal.
  await evaluate(`document.querySelector('.game-close').click()`)
  await sleep(300)
  await shot('mobile-site')
  console.log(JSON.stringify({ errors, output }))
  assert.equal(errors.length, 0, 'No page exceptions allowed')
} finally {
  ws.close()
  await fetch(`${endpoint}/json/close/${target.id}`)
}

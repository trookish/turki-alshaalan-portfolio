import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

class Surface extends EventTarget {
  captured = new Set()
  classes = new Set()
  style = {}
  classList = { add: (s) => this.classes.add(s), remove: (s) => this.classes.delete(s) }
  setPointerCapture(id) { this.captured.add(id) }
  hasPointerCapture(id) { return this.captured.has(id) }
  releasePointerCapture(id) { this.captured.delete(id) }
  getBoundingClientRect() { return { left: 0, top: 0, width: 120, height: 120 } }
  pointer(type, id, x = 60, y = 60) {
    const e = new Event(type, { cancelable: true })
    Object.assign(e, { pointerId: id, clientX: x, clientY: y, button: 0, pointerType: 'touch' })
    this.dispatchEvent(e)
  }
}

const moduleUrl = new URL('../../src/features/game/modules/input.js', import.meta.url)
test('a held touch action owns its finger and releases on capture loss or reset', async () => {
  assert.ok(existsSync(moduleUrl), 'shared, cancellable game pointer controls are required')
  const { bindPointerButton } = await import(moduleUrl)
  const el = new Surface()
  let presses = 0
  let releases = 0
  const control = bindPointerButton(el, () => presses++, () => releases++)
  el.pointer('pointerdown', 4)
  assert.equal(presses, 1)
  assert.ok(el.captured.has(4))
  el.pointer('pointerdown', 8)
  el.pointer('pointerup', 8)
  assert.equal(presses, 1)
  assert.equal(releases, 0)
  el.pointer('lostpointercapture', 4)
  assert.equal(releases, 1)
  el.pointer('pointerdown', 9)
  control.reset()
  assert.equal(releases, 2)
  assert.equal(el.classes.size, 0)
  control.dispose()
  el.pointer('pointerdown', 3)
  assert.equal(presses, 2)
})

test('joystick has a deadzone, retains its own finger, clamps travel and clears on cancel', async () => {
  const input = await import(moduleUrl)
  assert.equal(typeof input.bindJoystick, 'function', 'joystick must share the cancellable input lifecycle')
  const el = new Surface()
  const knob = new Surface()
  let value = [99, 99]
  const control = input.bindJoystick(el, knob, (x, y) => { value = [x, y] })
  el.pointer('pointerdown', 1, 62, 60)
  assert.deepEqual(value, [0, 0])
  el.pointer('pointermove', 1, 160, 60)
  assert.deepEqual(value, [1, 0])
  el.pointer('pointerdown', 2, 0, 60)
  el.pointer('pointermove', 2, 0, 60)
  assert.deepEqual(value, [1, 0])
  el.pointer('pointercancel', 1)
  assert.deepEqual(value, [0, 0])
  assert.match(knob.style.transform, /0px/)
  control.dispose()
  el.pointer('pointerdown', 3, 160, 60)
  assert.deepEqual(value, [0, 0])
})

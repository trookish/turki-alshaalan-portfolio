/**
 * Game runtime — ports legacy/game.js orchestration to the React modal.
 * Heavy three.js modules load only when the user opens the game.
 */
import { createEngine } from './modules/engine.js'
import { createKnight } from './modules/knight.js'
import { ParticlePool, ScreenShake, HitStop, HUD, worldToScreen } from './modules/effects.js'
import { Player, Boss } from './modules/combat.js'
import { bindJoystick, bindPointerButton } from './modules/input.js'
import { gameAr, gameEn } from './strings'
import type { Lang } from '../../i18n/types'
import type { Scene, PerspectiveCamera, Vector3, Object3D } from 'three'

interface EngineHandle {
  renderer: unknown
  scene: Scene
  camera: PerspectiveCamera
  updateCamera: (dt: number, playerPos: Vector3, playerHeading: number, bossPos: Vector3, locked: boolean) => void
  updateEnvironment: (dt: number) => void
  render: () => void
  resize: () => void
  camRig: { shakeX: number; shakeY: number; shakeZ: number; [k: string]: unknown }
  getStats?: () => { drawCalls: number; triangles: number; pixelRatio: number }
  updatePerformance?: (frameSeconds: number) => void
  dispose: () => void
}

interface KnightRig {
  root: Object3D
  [k: string]: unknown
}

export interface StartOptions {
  lang: Lang
  soundEnabled: boolean
  onExit?: () => void
  onPauseChange?: (paused: boolean) => void
  onSoundToggle?: (enabled: boolean) => void
}

export interface GameHandle {
  dispose: () => void
  resize: () => void
  begin: () => void
  togglePause: () => void
  clearInput: () => void
}

const SOUND_PATHS = {
  dodge: 'Sounds/Game/jump.wav',
  hit: 'Sounds/Game/hitHurt.wav',
  block: 'Sounds/Game/block.wav',
  gameOver: 'Sounds/Game/gameoversound.wav',
  windowOpen: 'Sounds/Game/windowopen.wav',
  countdown: 'Sounds/Game/countdown.wav',
} as const

type SoundName = keyof typeof SOUND_PATHS

const base = import.meta.env.BASE_URL

const PHASE_NAMES: Record<number, string> = {
  1: 'THE OATHBOUND',
  2: 'NIGHTMARE AWAKENS',
  3: 'ASHEN FURY',
}

export function startGame(canvas: HTMLCanvasElement, options: StartOptions): GameHandle {
  const getGameText = (enText: string): string => {
    if (options.lang === 'ar') return gameAr[enText] || enText
    return gameEn[enText] || enText
  }

  const sounds: Record<SoundName, HTMLAudioElement> = {
    dodge: new Audio(`${base}${SOUND_PATHS.dodge}`),
    hit: new Audio(`${base}${SOUND_PATHS.hit}`),
    block: new Audio(`${base}${SOUND_PATHS.block}`),
    gameOver: new Audio(`${base}${SOUND_PATHS.gameOver}`),
    windowOpen: new Audio(`${base}${SOUND_PATHS.windowOpen}`),
    countdown: new Audio(`${base}${SOUND_PATHS.countdown}`),
  }

  let soundEnabled = options.soundEnabled
  const applyVolumes = () => {
    const v = soundEnabled ? 1 : 0
    sounds.dodge.volume = 0.3 * v
    sounds.hit.volume = 0.4 * v
    sounds.block.volume = 0.35 * v
    sounds.gameOver.volume = 0.5 * v
    sounds.windowOpen.volume = 0.4 * v
    sounds.countdown.volume = 0.5 * v
  }
  applyVolumes()

  const onSoundEvt = (e: Event) => {
    const detail = (e as CustomEvent<{ enabled: boolean }>).detail
    soundEnabled = detail.enabled
    applyVolumes()
    options.onSoundToggle?.(detail.enabled)
  }
  window.addEventListener('soundToggle', onSoundEvt)

  const playSound = (name: SoundName, rate = 1) => {
    if (!soundEnabled) return
    const s = sounds[name]
    s.pause()
    s.currentTime = 0
    s.playbackRate = rate
    void s.play().catch(() => {})
  }

  const isMobileDevice = () => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isSmallScreen = window.innerWidth <= 768
    return (isTouch && isSmallScreen) || isMobileUA
  }

  const isMobile = isMobileDevice()
  const engine: EngineHandle = createEngine(canvas, isMobile)

  const playerRig: KnightRig = createKnight({ color: 0x4ade80, darkColor: 0x14201a, scale: 1 })
  const bossRig: KnightRig = createKnight({ color: 0xef4444, darkColor: 0x241416, scale: 1.28, isBoss: true })
  engine.scene.add(playerRig.root, bossRig.root)

  const player = new Player(playerRig)
  const boss = new Boss(bossRig)

  const particles = new ParticlePool(engine.scene, isMobile ? 90 : 140)
  const shake = new ScreenShake()
  const hitStop = new HitStop()

  // HUD overlays the canvas stage so it never needs manual offset math
  const stage = (canvas.parentElement as HTMLElement | null) ?? canvas
  const hud = new HUD(stage, getGameText)
  hud.setBossName(getGameText('DARK KNIGHT'))

  type GameState = 'idle' | 'countdown' | 'playing' | 'over' | 'win'
  let gameState: GameState = 'idle'
  let paused = false
  let countdownValue = 3
  let countdownTimer = 0
  let gameRunning = true
  let lastFrameTime = 0
  let accumulator = 0
  let lastBannerPhase = 0
  let wasVulnerable = false
  let lastTellAttack = ''
  const TIME_STEP = 1000 / 60
  const MAX_ACCUMULATOR = TIME_STEP * 5

  const input = {
    keys: {} as Record<string, boolean>,
    moveVec: {
      x: 0,
      z: 0,
      length() {
        return Math.hypot(this.x, this.z)
      },
    },
    joyX: 0,
    joyY: 0,
    sprint: false,
    locked: true,
    blockHeld: false,
  }
  const camFwd = { x: 0, z: -1 }
  const camRight = { x: 1, z: 0 }
  const rollDir = {
    x: 0,
    y: 0,
    z: 0,
    lengthSq() {
      return this.x * this.x + this.z * this.z
    },
  }

  const currentRollDir = () => {
    rollDir.x = input.moveVec.x
    rollDir.z = input.moveVec.z
    return rollDir
  }

  const updateMoveVec = () => {
    let ix = 0
    let iy = 0
    if (input.keys['w'] || input.keys['arrowup']) iy += 1
    if (input.keys['s'] || input.keys['arrowdown']) iy -= 1
    if (input.keys['a'] || input.keys['arrowleft']) ix -= 1
    if (input.keys['d'] || input.keys['arrowright']) ix += 1
    ix += input.joyX
    iy -= input.joyY

    const len = Math.hypot(ix, iy)
    if (len > 1) {
      ix /= len
      iy /= len
    }

    input.moveVec.x = camRight.x * ix + camFwd.x * iy
    input.moveVec.z = camRight.z * ix + camFwd.z * iy
  }

  function showPhaseBanner(phase: number) {
    const resolved = typeof phase === 'number' && phase >= 1 ? Math.floor(phase) : 1
    if (resolved === lastBannerPhase) return
    lastBannerPhase = resolved
    hud.showCenter(getGameText(PHASE_NAMES[resolved] || PHASE_NAMES[1]), { cls: 'bad', duration: 1500 })
    hud.flash('rgba(239, 68, 68, 0.3)', 350)
    shake.add(0.5)
    playSound('hit', 0.5)
    particles.spawn(boss.pos.x, boss.pos.y + 1.5, boss.pos.z, 30, { color: 0xef4444, speed: 4.5, life: 0.8 })
  }

  const ctx = {
    onPlayerHit(res: string, atk: { damage: number }, pl: Player) {
      const hitY = pl.pos.y + 1.2
      if (res === 'dodged') {
        particles.spawn(pl.pos.x, hitY - 0.5, pl.pos.z, 4, { color: 0x9fdfb8, speed: 1, life: 0.3, gravity: 2 })
        return
      }
      if (res === 'parried') {
        playSound('block', 1.5)
        hitStop.freeze(140)
        shake.add(0.35)
        hud.flash('rgba(74, 222, 128, 0.28)', 220)
        hud.showCenter(getGameText('PARRY!'), { cls: 'good', duration: 700 })
        particles.spawn(pl.pos.x, hitY, pl.pos.z, 18, { color: 0x4ade80, speed: 4, life: 0.5 })
        return
      }
      if (res === 'blocked') {
        playSound('block', 1)
        shake.add(0.12)
        particles.spawn(pl.pos.x, hitY, pl.pos.z, 8, { color: 0xfbbf24, speed: 2.5, life: 0.35 })
        return
      }
      if (res === 'guardbroken') {
        playSound('block', 0.7)
        hitStop.freeze(160)
        shake.add(0.45)
        hud.flash('rgba(251, 191, 36, 0.3)', 260)
        hud.showCenter(getGameText('GUARD BREAK!'), { cls: 'bad', duration: 900 })
        return
      }
      playSound('hit', 1)
      hitStop.freeze(atk.damage >= 24 ? 110 : 70)
      shake.add(Math.min(0.6, 0.2 + atk.damage * 0.012))
      hud.flash('rgba(239, 68, 68, 0.3)', 240)
      particles.spawn(pl.pos.x, hitY, pl.pos.z, 12, { color: 0xef4444, speed: 3, life: 0.5 })
      const s = worldToScreen({ x: pl.pos.x, y: hitY + 0.4, z: pl.pos.z }, engine.camera, canvas)
      if (!s.behind) hud.damageNumber('-' + atk.damage, s.x, s.y, 'bad')
    },

    onBossHit(res: string, atk: { damage: number; riposte?: boolean }, bs: Boss) {
      const hitY = bs.pos.y + 1.5
      if (res === 'blocked') {
        playSound('block', 1.1)
        shake.add(0.08)
        particles.spawn(bs.pos.x, hitY, bs.pos.z, 6, { color: 0xfbbf24, speed: 2, life: 0.3 })
        return
      }
      const rip = !!atk.riposte
      playSound('hit', rip ? 0.6 : 0.85)
      hitStop.freeze(rip ? 200 : 60)
      shake.add(rip ? 0.55 : 0.15)
      particles.spawn(bs.pos.x, hitY, bs.pos.z, rip ? 26 : 10, {
        color: rip ? 0xfde047 : 0xffd0a0,
        speed: rip ? 5 : 3,
        life: 0.5,
      })
      if (rip) {
        hud.flash('rgba(253, 224, 71, 0.25)', 260)
        hud.showCenter(getGameText('RIPOSTE!'), { cls: 'good', duration: 800 })
      }
      const s = worldToScreen({ x: bs.pos.x, y: hitY + 0.4, z: bs.pos.z }, engine.camera, canvas)
      if (!s.behind) hud.damageNumber(String(atk.damage), s.x, s.y, rip ? 'crit' : '')
      if (bs.dead) onBossDefeated()
    },

    onPlayerHealed(pl: Player) {
      particles.spawn(pl.pos.x, pl.pos.y + 1, pl.pos.z, 14, {
        color: 0x4ade80,
        speed: 1.5,
        up: 2.5,
        life: 0.7,
        gravity: 1.5,
      })
      playSound('countdown', 0.9)
      hud.setTell(getGameText('GREAT HEAL'), { duration: 1100 })
    },

    onBossRage(bs: Boss) {
      showPhaseBanner(typeof bs.phase === 'number' ? bs.phase : 2)
    },

    onPhaseChange(phaseOrBoss: unknown) {
      showPhaseBanner(typeof phaseOrBoss === 'number' ? phaseOrBoss : (boss.phase ?? 1))
    },

    onBossTell(text: unknown) {
      if (typeof text === 'string' && text) {
        hud.setTell(getGameText(text), { danger: true, duration: 1700 })
      }
    },
  }

  function onBossDefeated() {
    gameState = 'win'
    input.locked = false
    player.state = 'victory'
    player.stateTime = 0
    hitStop.freeze(300)
    shake.add(0.6)
    playSound('windowOpen', 0.9)
    hud.showLock(false)
    hud.showCenter(
      getGameText('VICTORY!') + `<div class="hud-sub">${getGameText('Press R to Play Again')}</div>`,
      { cls: 'good', retry: getGameText('RETRY'), onRetry: retryGame },
    )
  }

  function onPlayerDefeated() {
    gameState = 'over'
    playSound('gameOver', 1)
    hud.flash('rgba(0, 0, 0, 0.55)', 900)
    hud.showLock(false)
    hud.showCenter(
      getGameText('YOU DIED') + `<div class="hud-sub">${getGameText('Press R to Restart')}</div>`,
      { cls: 'bad', retry: getGameText('RETRY'), onRetry: retryGame },
    )
  }

  function retryGame() {
    hud.showCenter('')
    resetGame(true)
  }

  function resetGame(skipCountdown = false) {
    player.reset()
    boss.reset()
    input.locked = true
    lastBannerPhase = 0
    wasVulnerable = false
    hud.setBossName(getGameText('DARK KNIGHT'))
    hud.showBossBar(true)
    hud.setBars(1, 1, player.estus, player.estusMax, 1)
    hud.setBoss(1, 0, 1, false)
    hud.setLowHealth(false)
    hud.setTell('')
    hud.showCenter('')
    if (skipCountdown) {
      gameState = 'playing'
      hud.showCenter(getGameText('GO!'), { cls: 'good', duration: 600 })
      playSound('countdown', 1.3)
    } else {
      gameState = 'countdown'
      countdownValue = 3
      countdownTimer = 0
    }
  }

  const updateCameraBasis = () => {
    const e = engine.camera.matrixWorld.elements
    camFwd.x = -e[8]
    camFwd.z = -e[10]
    const l = Math.hypot(camFwd.x, camFwd.z) || 1
    camFwd.x /= l
    camFwd.z /= l
    camRight.x = -camFwd.z
    camRight.z = camFwd.x
  }

  function tick(dt: number) {
    if (gameState === 'countdown') {
      countdownTimer += dt
      if (countdownTimer >= 1) {
        countdownTimer = 0
        if (countdownValue > 1) {
          countdownValue--
          hud.showCenter(String(countdownValue), { cls: 'count' })
          playSound('countdown', 1)
        } else {
          gameState = 'playing'
          hud.showCenter(getGameText('GO!'), { cls: 'good', duration: 600 })
          playSound('countdown', 1.4)
        }
      }
      return
    }
    if (gameState !== 'playing' && gameState !== 'over' && gameState !== 'win') return

    updateMoveVec()
    player.update(dt, input, boss, ctx)
    boss.update(dt, player, ctx)

    const hpFrac = player.hp / (player.maxHp || 1)
    hud.setBars(
      hpFrac,
      player.stamina / (player.maxStamina || 1),
      player.estus,
      player.estusMax,
      (boss.hp || 0) / (boss.maxHp || 1),
    )
    hud.setBoss(
      (boss.hp || 0) / (boss.maxHp || 1),
      (boss.poise || 0) / (boss.maxPoise || 100),
      typeof boss.phase === 'number' ? boss.phase : 1,
      !!boss.vulnerable,
    )
    hud.setLowHealth(hpFrac > 0 && hpFrac < 0.3)
    if (boss.vulnerable && !wasVulnerable) {
      hud.setTell(getGameText('RIPOSTE READY'), { duration: 1200 })
    }
    wasVulnerable = !!boss.vulnerable

    // The unblockable slam is only fair if the windup carries a written warning.
    const attackName = typeof boss.attackName === 'string' ? boss.attackName : ''
    if (attackName && attackName !== lastTellAttack) {
      lastTellAttack = attackName
      if (attackName === 'quakeSlam') {
        hud.setTell(getGameText('UNBLOCKABLE SLAM'), { danger: true, duration: 1500 })
        playSound('block', 0.65)
      }
    } else if (!attackName) {
      lastTellAttack = ''
    }

    if (player.dead && gameState === 'playing') onPlayerDefeated()
  }

  function gameLoop(timestamp: number) {
    if (!gameRunning) return
    requestAnimationFrame(gameLoop)

    if (!lastFrameTime) lastFrameTime = timestamp
    const frameTime = Math.min(timestamp - lastFrameTime, MAX_ACCUMULATOR)
    lastFrameTime = timestamp
    accumulator += frameTime

    const dtReal = frameTime / 1000
    const frozen = hitStop.tick(dtReal)

    while (accumulator >= TIME_STEP) {
      accumulator -= TIME_STEP
      if (!frozen && !paused) tick(TIME_STEP / 1000)
    }

    shake.apply(dtReal, engine.camRig)
    particles.update(dtReal)
    engine.updateEnvironment(dtReal)
    updateCameraBasis()
    engine.updateCamera(dtReal, player.pos, player.heading ?? 0, boss.pos, input.locked && !boss.dead)
    engine.updatePerformance?.(dtReal)

    // Lock-on marker rides on the boss's projected chest position.
    if (input.locked && !boss.dead && (gameState === 'playing' || gameState === 'countdown')) {
      engine.camera.updateMatrixWorld()
      const s = worldToScreen(
        { x: boss.pos.x, y: boss.pos.y + 2.35, z: boss.pos.z },
        engine.camera,
        canvas,
      )
      hud.showLock(!s.behind, s.x, s.y)
    } else {
      hud.showLock(false)
    }

    engine.render()
  }

  // ---------- Input ----------
  const onKeyDown = (e: KeyboardEvent) => {
    if (!gameRunning) return
    const k = e.key.toLowerCase()
    input.keys[k] = true
    if (k === 'shift') input.sprint = true

    if (k === 'p' && !e.repeat && (gameState === 'playing' || gameState === 'countdown')) {
      togglePause()
      return
    }
    if (paused) return

    if (gameState === 'playing' && !e.repeat) {
      if (k === 'j') player.tryAttack()
      if (k === ' ') {
        e.preventDefault()
        if (player.tryRoll(currentRollDir(), input.locked)) playSound('dodge', 1)
      }
      if (k === 'e') player.tryHeal(ctx)
      if (k === 'q') input.locked = !input.locked
      if (k === 'k') player.setBlock(true)
    }
    if (k === 'k' && !e.repeat) input.blockHeld = true
    if (k === 'r' && (gameState === 'over' || gameState === 'win')) retryGame()
  }

  const onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    input.keys[k] = false
    if (k === 'shift') input.sprint = false
    if (k === 'k') {
      input.blockHeld = false
      player.setBlock(false)
    }
  }

  const onMouseDown = (e: MouseEvent) => {
    if (!gameRunning || paused || gameState !== 'playing') return
    if (e.button === 0) player.tryAttack()
    if (e.button === 2) {
      input.blockHeld = true
      player.setBlock(true)
    }
  }
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
      input.blockHeld = false
      player.setBlock(false)
    }
  }
  const onContextMenu = (e: Event) => e.preventDefault()
  const onVisibility = () => {
    if (document.hidden) lastFrameTime = 0
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('contextmenu', onContextMenu)
  document.addEventListener('visibilitychange', onVisibility)

  // ---------- Touch controls (pointer ownership, radial deadzone) ----------
  const touchBindings: Array<{ reset: () => void; dispose: () => void }> = []
  const joyZone = document.getElementById('mobileJoystick')
  const joyKnob = document.getElementById('joystickKnob')
  if (joyZone) {
    touchBindings.push(bindJoystick(joyZone, joyKnob, (x, y) => {
      input.joyX = x
      input.joyY = y
    }))
  }

  const bindAction = (id: string, onDown: () => void, onUp?: () => void) => {
    const el = document.getElementById(id)
    if (el) touchBindings.push(bindPointerButton(el, onDown, onUp))
  }

  bindAction('btnAttack', () => {
    if (gameState === 'playing' && !paused) player.tryAttack()
  })
  bindAction('btnRoll', () => {
    if (gameState !== 'playing' || paused) return
    if (player.tryRoll(currentRollDir(), input.locked)) playSound('dodge', 1)
  })
  bindAction(
    'btnBlock',
    () => {
      if (gameState !== 'playing' || paused) return
      input.blockHeld = true
      player.setBlock(true)
    },
    () => {
      input.blockHeld = false
      player.setBlock(false)
    },
  )
  bindAction('btnHeal', () => {
    if (gameState === 'playing' && !paused) player.tryHeal(ctx)
  })
  bindAction('btnLock', () => {
    input.locked = !input.locked
  })

  const mobileExit = document.getElementById('mobileExit')
  const mobileRestart = document.getElementById('mobileRestart')
  const onExit = () => {
    gameRunning = false
    options.onExit?.()
  }
  const onRestart = () => {
    if (gameState === 'over' || gameState === 'win' || gameState === 'playing') retryGame()
  }
  mobileExit?.addEventListener('click', onExit)
  mobileRestart?.addEventListener('click', onRestart)

  function togglePause() {
    if (gameState !== 'playing' && gameState !== 'countdown') return
    paused = !paused
    options.onPauseChange?.(paused)
  }

  function clearInput() {
    input.keys = {}
    input.joyX = 0
    input.joyY = 0
    input.sprint = false
    input.blockHeld = false
    player.setBlock(false)
    touchBindings.forEach((binding) => binding.reset())
  }

  // Start: render the cathedral behind the intro screen; the fight begins on demand.
  hud.showBossBar(false)
  playSound('windowOpen', 1)
  engine.resize()
  lastFrameTime = 0
  accumulator = 0
  requestAnimationFrame(gameLoop)

  const onWindowResize = () => engine.resize()
  window.addEventListener('resize', onWindowResize)

  return {
    begin() {
      if (gameState !== 'idle') return
      playSound('countdown', 1.2)
      resetGame(false)
    },
    togglePause,
    clearInput,
    resize() {
      engine.resize()
    },
    dispose() {
      gameRunning = false
      window.removeEventListener('resize', onWindowResize)
      window.removeEventListener('soundToggle', onSoundEvt)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('contextmenu', onContextMenu)
      touchBindings.forEach((binding) => binding.dispose())
      mobileExit?.removeEventListener('click', onExit)
      mobileRestart?.removeEventListener('click', onRestart)
      hud.destroy()
      engine.dispose()
      playerRig.root.removeFromParent()
      bossRig.root.removeFromParent()
    },
  }
}

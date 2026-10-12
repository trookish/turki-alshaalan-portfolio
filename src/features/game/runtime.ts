/**
 * Game runtime — ports legacy/game.js orchestration to the React modal.
 * Heavy three.js modules load only when the user opens the game.
 */
import { createEngine } from './modules/engine.js'
import { createKnight } from './modules/knight.js'
import {
  ParticlePool, ScreenShake, HitStop, HUD, worldToScreen,
  WeaponTrail, ShockwavePool, AreaTelegraph, ImpactLight,
} from './modules/effects.js'
import { Player, Boss, DIFFICULTIES, DIFFICULTY_ORDER } from './modules/combat.js'
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
  setBloomBoost?: (amount: number) => void
  dispose: () => void
}

interface KnightRig {
  root: Object3D
  bladeTip: Object3D
  bladeBase: Object3D
  [k: string]: unknown
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyInfo {
  flasks: number
  bossHp: number
  playerHp: number
}

export interface StartOptions {
  lang: Lang
  soundEnabled: boolean
  difficulty?: Difficulty
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
  /** Store the difficulty; an encounter in progress restarts under it. */
  setDifficulty: (difficulty: Difficulty) => void
  difficultyInfo: (difficulty: Difficulty) => DifficultyInfo | undefined
}

interface AttackInfo {
  damage: number
  name?: string
  riposte?: boolean
  critical?: boolean
  heavy?: boolean
  guardCounter?: boolean
  unblockable?: boolean
  aoe?: boolean
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

const DIFFICULTY_TABLE = DIFFICULTIES as Record<string, DifficultyInfo>
const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTY_ORDER as readonly string[]).includes(value)

// Palette: player steel reads pale gold, the Warden's blade burns ember-red.
const PLAYER_TRAIL = 0xffe2a8
const BOSS_TRAIL = 0xff5a2a
const BOSS_TRAIL_RAGE = 0xff2a12
const BLOOD = 0xc0182a
const SPARK = 0xffc066

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

  const playerRig: KnightRig = createKnight({ color: 0xd9b26a, darkColor: 0x1c1a17, scale: 1 })
  const bossRig: KnightRig = createKnight({ color: 0xef4444, darkColor: 0x241416, scale: 1.28, isBoss: true })
  engine.scene.add(playerRig.root, bossRig.root)
  // Fighters cast moon shadows; the arena stone only receives them.
  for (const rig of [playerRig, bossRig]) {
    rig.root.traverse((node) => {
      if ((node as { isMesh?: boolean }).isMesh) node.castShadow = true
    })
  }

  let difficulty: Difficulty = isDifficulty(options.difficulty) ? options.difficulty : 'medium'
  const player = new Player(playerRig, { difficulty })
  const boss = new Boss(bossRig, { difficulty })

  const particles = new ParticlePool(engine.scene, isMobile ? 110 : 220)
  const playerTrail = new WeaponTrail(engine.scene, { color: PLAYER_TRAIL, intensity: 1.5, opacity: 0.7 })
  const bossTrail = new WeaponTrail(engine.scene, { color: BOSS_TRAIL, intensity: 2.1, opacity: 0.85, segments: 22 })
  const shockwaves = new ShockwavePool(engine.scene, 6)
  const telegraph = new AreaTelegraph(engine.scene)
  const impactLight = new ImpactLight(engine.scene)
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
  // Killing-blow slow motion and the bloom swell that rides with dramatic beats.
  let slowMo = 0
  let bloomPulse = 0
  let bloomLevel = 0
  let footstepTimer = 0
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

  const screenNumber = (x: number, y: number, z: number, text: string, cls = '') => {
    const s = worldToScreen({ x, y, z }, engine.camera, canvas)
    if (!s.behind) hud.damageNumber(text, s.x, s.y, cls)
  }

  /** Sparks fly away from the attacker, along the line of the blow. */
  const sparkDir = (from: Vector3, to: Vector3) => {
    const dx = to.x - from.x
    const dz = to.z - from.z
    const l = Math.hypot(dx, dz) || 1
    return { x: dx / l, y: 0.2, z: dz / l }
  }

  const bladeTipWorld = (rig: KnightRig) => {
    const tip = rig.bladeTip
    return tip ? tip.getWorldPosition(tip.position.clone()) : null
  }

  function showPhaseBanner(phase: number) {
    const resolved = typeof phase === 'number' && phase >= 1 ? Math.floor(phase) : 1
    if (resolved === lastBannerPhase) return
    lastBannerPhase = resolved
    hud.showCenter(getGameText(PHASE_NAMES[resolved] || PHASE_NAMES[1]), { cls: 'phase', duration: 2000 })
    hud.flash('rgba(200, 40, 20, 0.32)', 420)
    shake.add(0.6)
    bloomPulse = 1.4
    playSound('hit', 0.45)
    bossTrail.setColor(resolved >= 2 ? BOSS_TRAIL_RAGE : BOSS_TRAIL, resolved >= 3 ? 2.8 : 2.3)
    particles.spawn(boss.pos.x, boss.pos.y + 1.6, boss.pos.z, 46, {
      color: 0xff5a1e, speed: 6, up: 4, life: 1.1, gravity: 1.5, intensity: 2.4, radius: 0.6,
    })
    shockwaves.spawn(boss.pos.x, boss.pos.z, { radius: 6.5, duration: 0.9, color: 0xff4a1a, intensity: 2.2 })
    impactLight.flash(boss.pos.x, boss.pos.y + 2, boss.pos.z, { color: 0xff5a2a, intensity: 60, duration: 0.7 })
  }

  const ctx = {
    onPlayerHit(res: string, atk: AttackInfo, pl: Player) {
      const hitY = pl.pos.y + 1.2
      const dir = sparkDir(boss.pos, pl.pos)
      if (res === 'dodged') {
        particles.spawn(pl.pos.x, hitY - 0.6, pl.pos.z, 5, { color: 0xbfd8ff, speed: 1, life: 0.35, gravity: 1, intensity: 0.9 })
        return
      }
      if (res === 'parried') {
        playSound('block', 1.5)
        hitStop.freeze(160)
        shake.add(0.4)
        bloomPulse = Math.max(bloomPulse, 0.9)
        hud.flash('rgba(255, 236, 190, 0.3)', 220)
        hud.showCenter(getGameText('PARRY!'), { cls: 'good', duration: 700 })
        particles.spawn(pl.pos.x, hitY + 0.2, pl.pos.z, 26, { color: 0xfff1c4, speed: 6, life: 0.45, gravity: 9, dir: { x: -dir.x, y: 0.3, z: -dir.z }, intensity: 2.6 })
        impactLight.flash(pl.pos.x, hitY + 0.3, pl.pos.z, { color: 0xfff0c8, intensity: 45, duration: 0.3 })
        return
      }
      if (res === 'blocked') {
        playSound('block', 1)
        hitStop.freeze(50)
        shake.add(0.14)
        particles.spawn(pl.pos.x, hitY + 0.1, pl.pos.z, 12, { color: SPARK, speed: 4.5, life: 0.35, gravity: 10, dir: { x: -dir.x, y: 0.2, z: -dir.z }, intensity: 2.2 })
        impactLight.flash(pl.pos.x, hitY, pl.pos.z, { color: SPARK, intensity: 18, duration: 0.16 })
        return
      }
      if (res === 'guardbroken') {
        playSound('block', 0.7)
        hitStop.freeze(170)
        shake.add(0.5)
        hud.flash('rgba(251, 191, 36, 0.3)', 260)
        hud.showCenter(getGameText('GUARD BREAK!'), { cls: 'bad', duration: 900 })
        particles.spawn(pl.pos.x, hitY, pl.pos.z, 20, { color: SPARK, speed: 5, life: 0.5, gravity: 8, intensity: 2.2 })
        return
      }
      const heavyHit = atk.damage >= 24 || pl.state === 'knockdown'
      playSound('hit', heavyHit ? 0.8 : 1)
      hitStop.freeze(heavyHit ? 120 : 75)
      shake.add(Math.min(0.7, 0.22 + atk.damage * 0.013))
      hud.flash('rgba(160, 10, 20, 0.36)', 260)
      particles.spawn(pl.pos.x, hitY, pl.pos.z, heavyHit ? 22 : 14, { color: BLOOD, speed: 4, life: 0.55, gravity: 11, dir, intensity: 1.2 })
      impactLight.flash(pl.pos.x, hitY, pl.pos.z, { color: 0xff3a2a, intensity: 22, duration: 0.2 })
      screenNumber(pl.pos.x, hitY + 0.4, pl.pos.z, '-' + Math.round(atk.damage), 'bad')
    },

    onBossHit(res: string, atk: AttackInfo, bs: Boss) {
      const hitY = bs.pos.y + 1.6
      const dir = sparkDir(player.pos, bs.pos)
      if (res === 'blocked') {
        playSound('block', 1.1)
        shake.add(0.08)
        particles.spawn(bs.pos.x, hitY, bs.pos.z, 10, { color: SPARK, speed: 4, life: 0.3, gravity: 10, dir: { x: -dir.x, y: 0.2, z: -dir.z }, intensity: 2 })
        return
      }
      const crit = !!(atk.riposte || atk.critical)
      const heavy = !!(atk.heavy || atk.guardCounter)
      playSound('hit', crit ? 0.55 : heavy ? 0.7 : 0.85)
      hitStop.freeze(crit ? 240 : heavy ? 110 : 65)
      shake.add(crit ? 0.6 : heavy ? 0.3 : 0.16)
      particles.spawn(bs.pos.x, hitY, bs.pos.z, crit ? 40 : heavy ? 24 : 14, {
        color: crit ? 0xffd27a : BLOOD, speed: crit ? 6.5 : 4, life: crit ? 0.8 : 0.55, gravity: 10, dir, intensity: crit ? 2.6 : 1.2,
      })
      if (!crit) particles.spawn(bs.pos.x, hitY, bs.pos.z, 6, { color: SPARK, speed: 5, life: 0.25, gravity: 10, dir, intensity: 2.2 })
      impactLight.flash(bs.pos.x, hitY, bs.pos.z, { color: crit ? 0xffd27a : 0xff7a4a, intensity: crit ? 70 : 26, duration: crit ? 0.45 : 0.2 })
      hud.bossDamage(atk.damage)
      if (crit) {
        bloomPulse = Math.max(bloomPulse, 1.2)
        hud.flash('rgba(253, 224, 140, 0.28)', 280)
        hud.showCenter(getGameText('RIPOSTE!'), { cls: 'good', duration: 900 })
      } else if (atk.guardCounter) {
        hud.setTell(getGameText('GUARD COUNTER'), { duration: 900 })
      }
      screenNumber(bs.pos.x, hitY + 0.5, bs.pos.z, String(Math.round(atk.damage)), crit ? 'crit' : heavy ? 'heavy' : '')
      if (bs.state === 'stanceBreak' && !bs.dead) {
        hud.showCenter(getGameText('STANCE BROKEN'), { cls: 'good', duration: 900 })
      }
      if (bs.dead) onBossDefeated()
    },

    onPlayerHealed(pl: Player) {
      particles.spawn(pl.pos.x, pl.pos.y + 1, pl.pos.z, 22, {
        color: 0xffc35a, speed: 1.2, up: 2.6, life: 0.9, gravity: -0.6, intensity: 2, radius: 0.5,
      })
      impactLight.flash(pl.pos.x, pl.pos.y + 1.4, pl.pos.z, { color: 0xffb84a, intensity: 16, duration: 0.6 })
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

    onBossEvent(type: string, data: Record<string, unknown> = {}) {
      const num = (key: string, fallback: number) => (typeof data[key] === 'number' ? (data[key] as number) : fallback)
      switch (type) {
        case 'tell': {
          // Unblockable attacks get the red glint on the blade (the classic peril cue).
          if (data.unblockable) {
            const p = bladeTipWorld(bossRig)
            if (p) {
              particles.spawn(p.x, p.y, p.z, 14, { color: 0xff2a10, speed: 0.6, up: 0.4, life: 0.5, gravity: 0, intensity: 3 })
              impactLight.flash(p.x, p.y, p.z, { color: 0xff2a10, intensity: 30, duration: 0.45 })
            }
            playSound('block', 0.6)
          }
          const label = data.name === 'ashenNova' ? 'ASHEN NOVA'
            : data.name === 'jumpSlam' ? 'LEAPING SLAM'
              : data.unblockable ? 'UNBLOCKABLE SLAM' : ''
          if (label) hud.setTell(getGameText(label), { danger: true, duration: 1500 })
          // Area attacks paint their reach on the floor for the length of the windup.
          const atk = boss.currentAttack as { radius?: number; windup?: number; hold?: number } | null
          if (data.aoe && atk) {
            const radius = (atk.radius || 3) + 0.35
            telegraph.show(boss.pos.x, boss.pos.z, radius, (atk.windup || 0.8) + (atk.hold || 0), boss.pos)
          }
          break
        }
        case 'leap':
          particles.spawn(boss.pos.x, 0.1, boss.pos.z, 18, { color: 0x9a8a78, speed: 3, up: 1.2, life: 0.7, gravity: 3, intensity: 0.7, radius: 0.8 })
          shake.add(0.15)
          break
        case 'land': {
          const x = num('x', boss.pos.x)
          const z = num('z', boss.pos.z)
          const radius = num('radius', 3)
          telegraph.hide()
          shockwaves.spawn(x, z, { radius: radius * 1.15, duration: 0.6, color: 0xffa24a, intensity: 2 })
          particles.spawn(x, 0.15, z, 34, { color: 0xa89480, speed: 5.5, up: 2.2, life: 0.9, gravity: 5, intensity: 0.8, radius: radius * 0.4, drag: 1.5 })
          particles.spawn(x, 0.2, z, 16, { color: SPARK, speed: 6, up: 3, life: 0.4, gravity: 12, intensity: 2.4 })
          impactLight.flash(x, 0.8, z, { color: 0xffa24a, intensity: 48, duration: 0.35 })
          shake.add(0.55)
          playSound('hit', 0.5)
          break
        }
        case 'shockwave': {
          // The nova detonation: a second, wider ember ring over the landing burst.
          const x = num('x', boss.pos.x)
          const z = num('z', boss.pos.z)
          const radius = num('radius', 4)
          shockwaves.spawn(x, z, { radius: radius * 1.6, duration: 0.9, color: 0xff3a12, intensity: 2.6 })
          particles.spawn(x, 0.4, z, 40, { color: 0xff5a1e, speed: 7, up: 2.5, life: 0.9, gravity: 2, intensity: 2.4, radius: 0.6, drag: 1.2 })
          bloomPulse = Math.max(bloomPulse, 1)
          hud.flash('rgba(255, 90, 30, 0.22)', 260)
          shake.add(0.3)
          break
        }
        case 'roar':
          shockwaves.spawn(num('x', boss.pos.x), num('z', boss.pos.z), { radius: 5, duration: 1.1, color: 0xff6a3a, intensity: 1.4 })
          shake.add(0.35)
          bloomPulse = Math.max(bloomPulse, 0.8)
          break
        case 'stanceBreak':
          hitStop.freeze(160)
          shake.add(0.4)
          playSound('block', 0.55)
          hud.setTell(getGameText('RIPOSTE READY'), { duration: 1400 })
          particles.spawn(boss.pos.x, boss.pos.y + 1.4, boss.pos.z, 20, { color: 0xfff1c4, speed: 3, life: 0.6, gravity: 4, intensity: 2.2 })
          break
        case 'evade':
          particles.spawn(boss.pos.x, 0.1, boss.pos.z, 8, { color: 0x9a8a78, speed: 2, up: 0.6, life: 0.5, gravity: 3, intensity: 0.6 })
          break
        case 'delay': {
          // A held windup gives the blade a smouldering glint (the "wait for it" read).
          const p = bladeTipWorld(bossRig)
          if (p) particles.spawn(p.x, p.y, p.z, 4, { color: 0xffb070, speed: 0.4, up: 0.3, life: 0.4, gravity: 0, intensity: 2.2 })
          break
        }
        default:
          break
      }
    },

    onPlayerEvent(type: string) {
      switch (type) {
        case 'chargeReady': {
          const p = bladeTipWorld(playerRig) ?? player.pos.clone().setY(player.pos.y + 1.6)
          particles.spawn(p.x, p.y, p.z, 16, { color: 0xffe2a8, speed: 1.4, up: 0.8, life: 0.45, gravity: 0, intensity: 2.6 })
          impactLight.flash(p.x, p.y + 0.3, p.z, { color: 0xffe2a8, intensity: 20, duration: 0.35 })
          hud.setTell(getGameText('CHARGED'), { duration: 700 })
          break
        }
        case 'guardCounter':
          playerTrail.setColor(0xfff1c4, 2.2)
          break
        case 'knockdown':
          shake.add(0.35)
          particles.spawn(player.pos.x, 0.15, player.pos.z, 14, { color: 0xa89480, speed: 2.5, up: 0.8, life: 0.6, gravity: 4, intensity: 0.7, radius: 0.4 })
          break
        case 'backstep':
        case 'rollAttack':
        case 'runAttack':
          playSound('dodge', type === 'backstep' ? 1.25 : 0.9)
          break
        default:
          break
      }
    },
  }

  function onBossDefeated() {
    if (gameState === 'win') return
    gameState = 'win'
    input.locked = false
    player.state = 'victory'
    player.stateTime = 0
    hitStop.freeze(320)
    slowMo = 1.6
    bloomPulse = 1.6
    shake.add(0.7)
    telegraph.hide()
    playSound('windowOpen', 0.9)
    hud.showLock(false)
    particles.spawn(boss.pos.x, boss.pos.y + 1.4, boss.pos.z, 60, { color: 0xffc66a, speed: 3, up: 3, life: 1.6, gravity: -0.4, intensity: 2.2, radius: 0.8, drag: 1 })
    hud.showCenter(getGameText('ENEMY FELLED'), {
      cls: 'felled',
      sub: getGameText('Press R to Play Again'),
      retry: getGameText('RETRY'),
      onRetry: retryGame,
    })
  }

  function onPlayerDefeated() {
    gameState = 'over'
    slowMo = 1.1
    telegraph.hide()
    playSound('gameOver', 1)
    hud.flash('rgba(0, 0, 0, 0.55)', 900)
    hud.showLock(false)
    hud.showCenter(getGameText('YOU DIED'), {
      cls: 'died',
      sub: getGameText('Press R to Restart'),
      retry: getGameText('RETRY'),
      onRetry: retryGame,
    })
  }

  function retryGame() {
    hud.showCenter('')
    resetGame(true)
  }

  function resetGame(skipCountdown = false) {
    player.setDifficulty(difficulty)
    boss.setDifficulty(difficulty)
    player.reset()
    boss.reset()
    input.locked = true
    lastBannerPhase = 0
    wasVulnerable = false
    slowMo = 0
    bloomPulse = 0
    telegraph.hide()
    playerTrail.setColor(PLAYER_TRAIL, 1.5)
    bossTrail.setColor(BOSS_TRAIL, 2.1)
    hud.setBossName(getGameText('DARK KNIGHT'))
    hud.resetBossDamage()
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
      hud.showCenter(String(countdownValue), { cls: 'count' })
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

    // Heavy footfalls: the Warden's advance kicks up grit.
    if (boss.state === 'approach') {
      footstepTimer -= dt
      if (footstepTimer <= 0) {
        footstepTimer = 0.38
        particles.spawn(boss.pos.x, 0.08, boss.pos.z, 3, { color: 0x8a7c6c, speed: 1, up: 0.4, life: 0.5, gravity: 2, intensity: 0.5 })
      }
    }

    if (player.dead && gameState === 'playing') onPlayerDefeated()
  }

  function gameLoop(timestamp: number) {
    if (!gameRunning) return
    requestAnimationFrame(gameLoop)

    if (!lastFrameTime) lastFrameTime = timestamp
    const rawFrame = Math.min(timestamp - lastFrameTime, MAX_ACCUMULATOR)
    lastFrameTime = timestamp
    const dtReal = rawFrame / 1000

    // Slow motion eases back to real time over its duration.
    let timeScale = 1
    if (slowMo > 0 && !paused) {
      slowMo = Math.max(0, slowMo - dtReal)
      timeScale = 0.3 + 0.7 * (1 - Math.min(1, slowMo / 1.2))
    }
    const frameTime = rawFrame * timeScale
    accumulator += frameTime
    const dtScaled = frameTime / 1000

    const frozen = hitStop.tick(dtReal)

    while (accumulator >= TIME_STEP) {
      accumulator -= TIME_STEP
      if (!frozen && !paused) tick(TIME_STEP / 1000)
    }

    const fxDt = paused ? 0 : dtScaled
    shake.apply(dtReal, engine.camRig)
    particles.update(fxDt)
    shockwaves.update(fxDt)
    telegraph.update(fxDt)
    impactLight.update(fxDt)
    engine.updateEnvironment(fxDt)
    updateCameraBasis()
    engine.updateCamera(dtReal, player.pos, player.heading ?? 0, boss.pos, input.locked && !boss.dead)
    engine.updatePerformance?.(dtReal)

    // Trails sample the blade after the pose for this frame has been applied.
    playerRig.root.updateMatrixWorld()
    bossRig.root.updateMatrixWorld()
    playerTrail.update(fxDt, !paused && !!player.trailActive, playerRig.bladeTip, playerRig.bladeBase)
    bossTrail.update(fxDt, !paused && !!boss.trailActive, bossRig.bladeTip, bossRig.bladeBase)
    if (!player.trailActive && playerTrail.fade <= 0) playerTrail.setColor(PLAYER_TRAIL, 1.5)

    bloomPulse = Math.max(0, bloomPulse - dtReal * 1.4)
    const bloomTarget = bloomPulse + (boss.phase >= 3 ? 0.12 : 0)
    if (Math.abs(bloomTarget - bloomLevel) > 0.005) {
      bloomLevel = bloomTarget
      engine.setBloomBoost?.(bloomLevel)
    }

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
  const setHeavy = (held: boolean) => {
    if (held && (gameState !== 'playing' || paused)) return
    player.setHeavy(held)
  }

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
      if (k === 'l') setHeavy(true)
      if (k === ' ') {
        e.preventDefault()
        if (player.tryRoll(currentRollDir(), input.locked)) playSound('dodge', 1)
      }
      if (k === 'e') {
        if (player.estus <= 0) hud.setTell(getGameText('NO FLASKS'), { duration: 900 })
        else player.tryHeal(ctx)
      }
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
    if (k === 'l') player.setHeavy(false)
    if (k === 'k') {
      input.blockHeld = false
      player.setBlock(false)
    }
  }

  const onMouseDown = (e: MouseEvent) => {
    if (!gameRunning || paused || gameState !== 'playing') return
    if (e.button === 0) player.tryAttack()
    if (e.button === 1) {
      e.preventDefault()
      setHeavy(true)
    }
    if (e.button === 2) {
      input.blockHeld = true
      player.setBlock(true)
    }
  }
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 1) player.setHeavy(false)
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
  bindAction('btnHeavy', () => setHeavy(true), () => player.setHeavy(false))
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
    if (paused) player.setHeavy(false)
    options.onPauseChange?.(paused)
  }

  function clearInput() {
    input.keys = {}
    input.joyX = 0
    input.joyY = 0
    input.sprint = false
    input.blockHeld = false
    player.setBlock(false)
    player.setHeavy(false)
    touchBindings.forEach((binding) => binding.reset())
  }

  function setDifficulty(next: Difficulty) {
    if (!isDifficulty(next) || next === difficulty) return
    difficulty = next
    player.setDifficulty(next)
    boss.setDifficulty(next)
    if (gameState === 'idle') {
      // Keep the fighters behind the intro screen in step with the choice.
      player.reset()
      boss.reset()
      return
    }
    if (paused) {
      paused = false
      options.onPauseChange?.(false)
    }
    clearInput()
    retryGame()
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
    setDifficulty,
    difficultyInfo(name: Difficulty) {
      const row = DIFFICULTY_TABLE[name]
      return row ? { flasks: row.flasks, bossHp: row.bossHp, playerHp: row.playerHp } : undefined
    },
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
      playerTrail.dispose()
      bossTrail.dispose()
      hud.destroy()
      engine.dispose()
      playerRig.root.removeFromParent()
      bossRig.root.removeFromParent()
    },
  }
}

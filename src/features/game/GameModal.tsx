import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import { useOverlay } from '../../ui/OverlayContext'
import { useSound } from '../sound/SoundProvider'
import type { GameHandle } from './runtime'
import './game.css'

type ControlMode = 'desktop' | 'mobile'

function detectMobile(): boolean {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  return (isTouch && window.matchMedia('(pointer: coarse)').matches) || isMobileUA
}

export function GameModal() {
  const { t, lang } = useI18n()
  const { gameOpen, setGameOpen } = useOverlay()
  const { enabled: soundEnabled } = useSound()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameHandleRef = useRef<GameHandle | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [mode, setMode] = useState<ControlMode>(() => (detectMobile() ? 'mobile' : 'desktop'))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready) {
      gameHandleRef.current?.clearInput()
      gameHandleRef.current?.resize()
    }
  }, [mode, ready])

  useEffect(() => {
    if (!gameOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('.game-close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGameOpen(false)
      if (e.key !== 'Tab') return
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), canvas') ?? [])
        .filter((el) => el.getClientRects().length > 0)
      const current = items.indexOf(document.activeElement as HTMLElement)
      const next = (current + (e.shiftKey ? -1 : 1) + items.length) % items.length
      if (items[next]) { e.preventDefault(); items[next].focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previousFocus?.focus()
    }
  }, [gameOpen, setGameOpen])

  useEffect(() => {
    if (!gameOpen || !canvasRef.current) return
    let cancelled = false
    let dispose: (() => void) | undefined
    const canvas = canvasRef.current

    setReady(false)
    setError(null)
    setStarted(false)
    setPaused(false)

    import('./runtime')
      .then(({ startGame }) => {
        if (cancelled) return
        const handle = startGame(canvas, {
          lang,
          soundEnabled,
          onExit: () => setGameOpen(false),
          onPauseChange: setPaused,
        })
        dispose = handle.dispose
        gameHandleRef.current = handle
        setReady(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
      dispose?.()
      gameHandleRef.current = null
      setReady(false)
    }
    // soundEnabled is synced live via the soundToggle event inside runtime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOpen, lang])

  if (!gameOpen) return null

  return (
    <div ref={dialogRef} className={`game-modal active souls-game ${mode === 'mobile' ? 'touch-mode' : ''}`} role="dialog" aria-modal="true" aria-label={t('game_title')}>
      <div className="game-overlay" />
      <div className="game-container">
        <div className="game-header">
          <div className="game-wordmark"><span>{t('game_title')}</span><small>{t('game_difficulty')}</small></div>
          <div className="game-header-controls">
            <button type="button" className="control-toggle pause-toggle" disabled={!started || !ready} onClick={() => gameHandleRef.current?.togglePause()} aria-pressed={paused}>
              {t(paused ? 'game_resume' : 'game_pause')}
            </button>
            <button
              type="button"
              className={`control-toggle ${mode === 'desktop' ? 'active' : ''}`}
              onClick={() => setMode('desktop')}
            >
              {t('game_desktop')}
            </button>
            <button
              type="button"
              className={`control-toggle ${mode === 'mobile' ? 'active' : ''}`}
              onClick={() => setMode('mobile')}
            >
              {t('game_mobile')}
            </button>
            <button
              type="button"
              className="game-close"
              onClick={() => setGameOpen(false)}
              aria-label={t('game_exit')}
            >
              ×
            </button>
          </div>
        </div>

        <div className="game-stage">
          <canvas ref={canvasRef} id="gameCanvas" tabIndex={0} aria-label={t('game_canvas')} />
          {ready && !started && (
            <div className="game-intro game-screen">
              <div className="game-screen-panel">
                <p className="game-eyebrow">{t('game_location')}</p>
                <h2>{t('game_title')}</h2>
                <p className="game-intro-description">{t('game_intro')}</p>
                <div className="game-challenge"><span>{t('game_difficulty')}</span><span>{t('game_phases')}</span></div>
                <ul className="game-lessons">
                  <li>{t('game_tip_dodge')}</li>
                  <li>{t('game_tip_parry')}</li>
                  <li>{t('game_tip_stamina')}</li>
                </ul>
                <button type="button" className="game-primary" onClick={() => {
                  gameHandleRef.current?.begin()
                  setStarted(true)
                  canvasRef.current?.focus()
                }}>{t('game_begin')}</button>
                <p className="game-orientation">{t(mode === 'mobile' ? 'game_touch_hint' : 'game_keyboard_hint')}</p>
              </div>
            </div>
          )}
          {paused && started && (
            <div className="game-screen game-paused">
              <div className="game-screen-panel">
                <p className="game-eyebrow">{t('game_title')}</p>
                <h2>{t('game_paused')}</h2>
                <p>{t('game_pause_hint')}</p>
                <button type="button" className="game-primary" onClick={() => { gameHandleRef.current?.togglePause(); canvasRef.current?.focus() }}>{t('game_resume')}</button>
              </div>
            </div>
          )}
          {!ready && !error && (
            <div className="hud-center">
              <div className="hud-center-text count">{t('game_loading')}</div>
            </div>
          )}
          {error && (
            <div className="hud-center">
              <div className="hud-center-text bad">{t('game_error')}</div>
              <p className="hud-sub">{error}</p>
            </div>
          )}

          <div className={`mobile-controls ${mode === 'mobile' && started && !paused ? 'active' : ''}`} id="mobileControls">
            <div className="game-btn-row game-system-row">
              <div className="game-system-btns">
                <button type="button" className="system-btn exit-btn" id="mobileExit">
                  {t('game_exit')}
                </button>
                <button type="button" className="system-btn restart-btn" id="mobileRestart">
                  {t('game_restart')}
                </button>
              </div>
            </div>
            <div className="game-btn-row souls-controls-row">
              <div className="joystick-zone" id="mobileJoystick" aria-label={t('game_move')}>
                <div className="joystick-base" />
                <div className="joystick-knob" id="joystickKnob" />
              </div>
              <div className="souls-action-btns">
                <button type="button" className="souls-btn lock-btn" id="btnLock">
                  {t('game_btn_lock')}
                </button>
                <button type="button" className="souls-btn atk-btn" id="btnAttack">
                  {t('game_btn_attack')}
                </button>
                <button type="button" className="souls-btn heal-btn" id="btnHeal">
                  {t('game_btn_heal')}
                </button>
                <button type="button" className="souls-btn roll-btn" id="btnRoll">
                  {t('game_btn_roll')}
                </button>
                <button type="button" className="souls-btn block-btn" id="btnBlock">
                  {t('game_btn_block')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`game-controls-info ${mode === 'mobile' ? 'hide-mobile' : ''}`}>
          <span>{t('game_move')}</span>
          <span>{t('game_dodge')}</span>
          <span>{t('game_attack')}</span>
          <span>{t('game_block')}</span>
          <span>{t('game_heal')}</span>
          <span>{t('game_lock')}</span>
          <span>{t('game_esc')}</span>
          <span>{t('game_pause_key')}</span>
        </div>
      </div>
    </div>
  )
}

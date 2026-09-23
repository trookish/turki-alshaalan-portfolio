import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import { useOverlay } from '../../ui/OverlayContext'
import { useSound } from '../sound/SoundProvider'

type ControlMode = 'desktop' | 'mobile'

function detectMobile(): boolean {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  return (isTouch && window.innerWidth <= 768) || isMobileUA
}

export function GameModal() {
  const { t, lang } = useI18n()
  const { gameOpen, setGameOpen } = useOverlay()
  const { enabled: soundEnabled } = useSound()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameHandleRef = useRef<{ dispose: () => void; resize: () => void } | null>(null)
  const [mode, setMode] = useState<ControlMode>(() => (detectMobile() ? 'mobile' : 'desktop'))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready) gameHandleRef.current?.resize()
  }, [mode, ready])

  useEffect(() => {
    if (!gameOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGameOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gameOpen, setGameOpen])

  useEffect(() => {
    if (!gameOpen || !canvasRef.current) return
    let cancelled = false
    let dispose: (() => void) | undefined
    const canvas = canvasRef.current

    setReady(false)
    setError(null)

    import('./runtime')
      .then(({ startGame }) => {
        if (cancelled) return
        const handle = startGame(canvas, {
          lang,
          soundEnabled,
          onExit: () => setGameOpen(false),
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
    <div className="game-modal active" role="dialog" aria-modal="true" aria-label={t('game_title')}>
      <div className="game-overlay" onClick={() => setGameOpen(false)} />
      <div className="game-container">
        <div className="game-header">
          <span>{t('game_title')}</span>
          <div className="game-header-controls">
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
          <canvas ref={canvasRef} id="gameCanvas" />
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

          <div className={`mobile-controls ${mode === 'mobile' ? 'active' : ''}`} id="mobileControls">
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
              <div className="joystick-zone" id="mobileJoystick">
                <div className="joystick-base" />
                <div className="joystick-knob" id="joystickKnob" />
              </div>
              <div className="souls-action-btns">
                <button type="button" className="souls-btn lock-btn" id="btnLock">
                  LOCK
                </button>
                <button type="button" className="souls-btn atk-btn" id="btnAttack">
                  ATK
                </button>
                <button type="button" className="souls-btn heal-btn" id="btnHeal">
                  HEAL
                </button>
                <button type="button" className="souls-btn roll-btn" id="btnRoll">
                  ROLL
                </button>
                <button type="button" className="souls-btn block-btn" id="btnBlock">
                  BLOCK
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
        </div>
      </div>
    </div>
  )
}

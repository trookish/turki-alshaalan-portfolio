import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import { usePrint, type PrintMode } from './PrintProvider'

function ThemeGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
      <path d="M8.5 20.5h7M12 17v3.5" />
      <path d="M6 8.5h5M6 11.5h8M6 14h3" />
    </svg>
  )
}

function PaperGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 2.5h8l5 5v14H6z" />
      <path d="M14 2.5v5h5" />
      <path d="M9 12h7M9 15.5h7M9 19h4" />
    </svg>
  )
}

export function PrintDialog() {
  const { t } = useI18n()
  const { close, run, preparing } = usePrint()
  const firstRef = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<PrintMode>('paper')
  const busy = preparing !== null

  useEffect(() => {
    firstRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation()
        close()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey, true)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey, true)
    }
  }, [close, busy])

  const choose = (next: PrintMode) => {
    if (busy) return
    setMode(next)
  }

  const confirm = () => {
    if (busy) return
    void run(mode)
  }

  return (
    <div className="print-overlay" onClick={() => !busy && close()} role="presentation">
      <div
        className="print-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="print-bar">
          <span className="print-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="print-bar-title">export --pdf</span>
          <button type="button" className="print-close" onClick={close} disabled={busy} aria-label={t('print_cancel')}>
            ×
          </button>
        </div>

        <div className="print-dialog-body">
          <h2 id="print-dialog-title" className="print-dialog-title">
            {t('print_dialog_title')}
          </h2>
          <p className="print-dialog-desc">{t('print_dialog_desc')}</p>

          <div className="print-options">
            <button
              ref={firstRef}
              type="button"
              className={`print-option theme ${mode === 'theme' ? 'active' : ''} ${preparing === 'theme' ? 'busy' : ''}`}
              onClick={() => choose('theme')}
              aria-pressed={mode === 'theme'}
              disabled={busy}
            >
              <span className="print-option-glyph">
                <ThemeGlyph />
              </span>
              <span className="print-option-name">
                {t('print_mode_theme')}
                <em>{t('print_mode_theme_tag')}</em>
              </span>
              <span className="print-option-desc">{t('print_mode_theme_desc')}</span>
              <span className="print-option-swatch" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {preparing === 'theme' && <span className="print-option-busy">{t('print_preparing')}</span>}
            </button>

            <button
              type="button"
              className={`print-option paper ${mode === 'paper' ? 'active' : ''} ${preparing === 'paper' ? 'busy' : ''}`}
              onClick={() => choose('paper')}
              aria-pressed={mode === 'paper'}
              disabled={busy}
            >
              <span className="print-option-glyph">
                <PaperGlyph />
              </span>
              <span className="print-option-name">
                {t('print_mode_paper')}
                <em>{t('print_mode_paper_tag')}</em>
              </span>
              <span className="print-option-desc">{t('print_mode_paper_desc')}</span>
              <span className="print-option-swatch" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {preparing === 'paper' && <span className="print-option-busy">{t('print_preparing')}</span>}
            </button>
          </div>

          <div className="print-dialog-foot">
            <p className="print-hint">{t('print_save_hint')}</p>
            <div className="print-foot-actions">
              <button type="button" className="print-cancel" onClick={close} disabled={busy}>
                {t('print_cancel')}
              </button>
              <button type="button" className="print-go" onClick={confirm} disabled={busy}>
                {preparing ? t('print_preparing') : t('print_continue')}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

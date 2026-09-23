import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useTheme } from '../theme/ThemeProvider'
import { useSound } from '../features/sound/SoundProvider'

function useClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function StatusBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()
  const { toggle: toggleSound, enabled } = useSound()
  const clock = useClock()

  return (
    <footer className="statusbar" role="contentinfo">
      <div className="status-left">
        <span className="status-chip" title="Branch">
          <span className="status-dot" aria-hidden="true" />
          <strong>{t('status_main')}</strong>
        </span>
        <span className="hide-sm">{t('status_spaces')}</span>
        <span className="discipline-legend hide-sm" aria-hidden="true">
          <span className="legend-swe" />
          <span className="legend-ai" />
          <span className="legend-game" />
        </span>
      </div>
      <div className="status-right">
        <button
          type="button"
          className="status-chip sound-chip"
          onClick={toggleSound}
          aria-pressed={!enabled}
          aria-label={enabled ? t('sound_on') : t('sound_off')}
          title={enabled ? t('sound_on') : t('sound_off')}
        >
          <span aria-hidden="true">{enabled ? '🔊' : '🔇'}</span>
          <span className="sound-chip-label">{enabled ? t('sound_label_on') : t('sound_label_off')}</span>
        </button>
        <button type="button" className="status-chip hide-sm" onClick={onOpenPalette} title={t('nav_palette_tip')}>
          ⌘K
        </button>
        <span className="hide-sm">{clock}</span>
        <button type="button" className="status-chip" onClick={toggle}>
          {theme === 'dark' ? t('status_mode') : 'PAPER'}
        </button>
        <span>{t('nav_lang')}</span>
      </div>
    </footer>
  )
}

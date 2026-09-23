import { useI18n } from '../i18n/LanguageContext'
import { useSound } from '../features/sound/SoundProvider'

export function SoundFab() {
  const { t } = useI18n()
  const { enabled, toggle } = useSound()

  return (
    <button
      type="button"
      className={`sound-fab${enabled ? '' : ' muted'}`}
      onClick={toggle}
      aria-pressed={!enabled}
      aria-label={enabled ? t('sound_on') : t('sound_off')}
      title={enabled ? t('sound_on') : t('sound_off')}
    >
      <span className="sound-fab-icon" aria-hidden="true">
        {enabled ? '🔊' : '🔇'}
      </span>
      <span className="sound-fab-label">{enabled ? t('sound_label_on') : t('sound_label_off')}</span>
    </button>
  )
}

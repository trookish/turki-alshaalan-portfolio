import { useI18n } from '../i18n/LanguageContext'

export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line px-4 py-6 text-center font-mono text-xs text-ink3 sm:px-6">
      <p>
        © {year} {t('footer_text')} — {t('footer_rights')}
      </p>
    </footer>
  )
}

import { useI18n } from '../i18n/LanguageContext'

export function Footer() {
  const { t, lang } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line px-4 py-6 text-center font-mono text-xs text-ink3 sm:px-6">
      <p>
        © {year} {t('footer_text')} — {t('footer_rights')}
      </p>
      <p className="mt-1 opacity-70">{lang === 'ar' ? 'صُنع بـ React + Tailwind + terminal energy' : 'Built with React + Tailwind + terminal energy'}</p>
    </footer>
  )
}

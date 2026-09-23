import { useI18n } from '../i18n/LanguageContext'
import { profile } from '../data/profile'

const base = import.meta.env.BASE_URL
const heroBg = `${base}images/Background/Background.webp`

export function Hero() {
  const { t, b } = useI18n()

  return (
    <section id="home" className="hero relative overflow-hidden">
      <div
        className="hero-bg"
        style={{ backgroundImage: `url("${heroBg}")` }}
        aria-hidden="true"
      />
      <div className="hero-bg-veil" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <h1 className="hero-name">
          {b(profile.nameFirst)} <span className="accent">{b(profile.nameLast)}</span>
        </h1>

        <p className="hero-role">
          <span className="r-swe">{t('hero_role_swe')}</span>
          <span className="sep">×</span>
          <span className="r-ai">{t('hero_role_ai')}</span>
          <span className="sep">×</span>
          <span className="r-game">{t('hero_role_game')}</span>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#projects" className="btn btn-primary">
            {t('hero_btn_projects')}
          </a>
          <a href="#contact" className="btn">
            {t('hero_btn_contact')}
          </a>
        </div>
      </div>

      <div className="scroll-hint" aria-hidden="true">
        ↓ {t('hero_scroll')}
      </div>
    </section>
  )
}

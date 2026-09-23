import { useI18n } from '../i18n/LanguageContext'
import { profile } from '../data/profile'

export function About() {
  const { t, lang } = useI18n()

  return (
    <section id="about" className="reveal">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-14 md:py-20">
        <div className="section-head">
          <span className="section-num">01</span>
          <h2 className="section-title">{t('about_title')}</h2>
        </div>
        <p className="section-subtitle">{t('about_subtitle')}</p>

        <div className="about-grid grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="window">
            <div className="window-bar">
              <span className="window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="window-title">{t('about_title')}</span>
            </div>
            <div className="term" style={{ border: 0 }}>
              <div className="term-body grid gap-5">
                {profile.about.map((block) => (
                  <div key={block.labelKey} className="term-line">
                    <div>
                      <strong>{t(block.labelKey)}</strong>
                    </div>
                    <p
                      className="mt-1 text-ink2"
                      dangerouslySetInnerHTML={{ __html: block.text[lang] }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="stats-grid grid grid-cols-2 gap-3">
              {profile.stats.map((stat) => (
                <a
                  key={stat.labelKey}
                  href={stat.href}
                  className="window block p-4 transition hover:border-green"
                >
                  <div className="font-mono text-2xl font-bold text-green">{stat.value}</div>
                  <div className="mt-1 font-mono text-[0.7rem] uppercase tracking-wider text-ink3">
                    {t(stat.labelKey)}
                  </div>
                </a>
              ))}
            </div>

            <div className="window p-4">
              <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-wider text-ink3">
                {t('about_disciplines')}
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.disciplines.map((d) => (
                  <span key={d.id} className={`tag tag-${d.id}`}>
                    {d.label[lang]}
                  </span>
                ))}
              </div>
            </div>

            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="window block overflow-hidden transition hover:border-green"
            >
              <img
                src={profile.photo}
                alt={profile.name[lang]}
                className="h-44 w-full object-cover object-[center_20%]"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

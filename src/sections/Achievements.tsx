import { useI18n } from '../i18n/LanguageContext'
import { Section } from '../components/Section'
import { useOverlay } from '../ui/OverlayContext'
import { achievements } from '../data/achievements'

export function Achievements() {
  const { t, b } = useI18n()
  const { openAchievement } = useOverlay()

  return (
    <Section id="achievements" num="07" titleKey="achievements_title" subtitleKey="achievements_subtitle">
      <div className="achievements-grid">
        {achievements.map((ach) => (
          <article
            key={ach.id}
            className="ach-card"
            tabIndex={0}
            role="button"
            aria-label={b(ach.title)}
            onClick={() => openAchievement(ach)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openAchievement(ach)
              }
            }}
          >
            <div className="ach-media">
              <img src={ach.cover} alt={b(ach.title)} loading="lazy" />
              <span className="showcase-cta">{t('showcase_cta')}</span>
            </div>
            <div className="ach-body">
              <div className="window-bar">
                <span className="window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="window-title">{b(ach.issuer)}</span>
                <span className="ach-date">{b(ach.date)}</span>
              </div>
              <h3 className="ach-title">{b(ach.title)}</h3>
              <p className="ach-project">
                <span className="ach-project-label">{b(ach.projectLabel)}</span>
                <strong>{b(ach.projectTitle)}</strong>
              </p>
              <div className="project-tags">
                {ach.tags.map((tag) => (
                  <span key={tag.en} className={`tag tag-${ach.disciplines[0]}`}>
                    {b(tag)}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

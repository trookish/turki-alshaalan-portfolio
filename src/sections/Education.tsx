import { useI18n } from '../i18n/LanguageContext'
import { LinkedInBtn, Section } from '../components/Section'
import { educationTracks } from '../data/education'
import { linkedinDetails } from '../data/site'

export function Education() {
  const { b, t } = useI18n()

  return (
    <Section id="education" num="05" titleKey="education_title" subtitleKey="education_subtitle">
      <div className="education-columns grid gap-5 md:grid-cols-2">
        {educationTracks.map((track, i) => (
          <div key={track.title.en}>
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-green">
              {i === 0 ? t('edu_onsite') : t('edu_online')}
            </div>
            <div className="grid gap-4">
              {track.items.map((item) => (
                <article key={item.degree.en} className="edu-card window flex gap-4 p-4">
                  <div className="edu-logo-box h-14 w-14 shrink-0 overflow-hidden border border-line bg-inset">
                    <img src={item.logo} alt="" className="edu-logo" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-mono text-sm font-bold text-ink">{b(item.degree)}</h3>
                    <p className="font-mono text-sm text-green">{b(item.institution)}</p>
                    <p className="font-mono text-xs text-ink3">{b(item.date)}</p>
                    <p className="mt-1 text-sm text-ink2">{b(item.detail)}</p>
                    {item.activities && item.activities.length > 0 && (
                      <div className="mt-2">
                        <p className="font-mono text-[0.68rem] uppercase tracking-wider text-ink3">
                          {t('edu_activities')}
                        </p>
                        {item.activities.map((act) => (
                          <p key={act.label.en} className="mt-1 flex items-center gap-2 text-sm text-ink2">
                            <img src={act.icon} alt="" className="edu-activity-icon" loading="lazy" />
                            {b(act.label)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      <LinkedInBtn href={linkedinDetails('education')} labelKey="linkedin_education" />
    </Section>
  )
}

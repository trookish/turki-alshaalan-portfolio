import { useI18n } from '../i18n/LanguageContext'
import { LinkedInBtn, Section } from '../components/Section'
import { experience } from '../data/experience'
import { linkedinDetails } from '../data/site'

export function Experience() {
  const { b } = useI18n()

  return (
    <Section id="experience" num="03" titleKey="experience_title" subtitleKey="experience_subtitle">
      <div className="grid gap-4 max-w-3xl">
        {experience.map((item) => (
          <article key={item.organization.en} className="exp-card window flex gap-4 p-4 md:p-5">
            <div className="h-14 w-14 shrink-0 overflow-hidden border border-line bg-inset">
              <img src={item.logo} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
            </div>
            <div className="min-w-0">
              <h3 className="font-mono text-base font-bold text-ink">{b(item.title)}</h3>
              <p className="font-mono text-sm text-green">{b(item.organization)}</p>
              <p className="text-sm text-ink2">{b(item.description)}</p>
              <span className="mt-1 inline-block font-mono text-xs text-ink3">{b(item.date)}</span>
            </div>
          </article>
        ))}
      </div>
      <LinkedInBtn href={linkedinDetails('experience')} labelKey="linkedin_experience" />
    </Section>
  )
}

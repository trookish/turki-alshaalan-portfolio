import { useMemo } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { LinkedInBtn, Section } from '../components/Section'
import { skillCategories } from '../data/skills'
import { linkedinDetails } from '../data/site'

export function Skills() {
  const { b, t } = useI18n()

  const marqueeItems = useMemo(() => skillCategories.flatMap((c) => c.items.map(b)), [b])
  const duration = Math.max(18, Math.round(marqueeItems.length * 1.1))

  return (
    <Section id="skills" num="04" titleKey="skills_title" subtitleKey="skills_subtitle">
      <div className="marquee always-run mb-8" style={{ ['--marquee-duration' as string]: `${duration}s` }}>
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={`${item}-${i}`} className="tag" aria-hidden={i >= marqueeItems.length}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {skillCategories.map((cat) => (
          <div key={cat.name.en} className="skill-row window flex flex-col gap-3 p-4 md:flex-row md:items-start">
            <div className="md:w-56 shrink-0">
              <span
                className={`font-mono text-sm font-bold ${
                  cat.discipline === 'ai' ? 'text-ai' : cat.discipline === 'game' ? 'text-game' : 'text-green'
                }`}
              >
                {b(cat.name)}
              </span>
              <div className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-ink3">
                {cat.discipline === 'core'
                  ? t('skills_core')
                  : t(`filter_${cat.discipline}` as 'filter_swe' | 'filter_ai' | 'filter_game')}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item) => (
                <span
                  key={item.en}
                  className={`tag ${cat.discipline !== 'core' ? `tag-${cat.discipline}` : ''}`}
                >
                  {b(item)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <LinkedInBtn href={linkedinDetails('skills')} labelKey="linkedin_skills" />
    </Section>
  )
}

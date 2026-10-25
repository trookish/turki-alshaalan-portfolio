import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import type { MessageKey } from '../../i18n/messages'
import type { Discipline, Project } from '../../data/types'
import { profile } from '../../data/profile'
import { projects } from '../../data/projects'
import { experience } from '../../data/experience'
import { skillCategories } from '../../data/skills'
import { educationTracks } from '../../data/education'
import { certifications } from '../../data/certifications'
import { achievements } from '../../data/achievements'
import type { PrintMode } from './PrintProvider'

/* Page map — every section owns one sheet; Projects spans three. */
const PAGE = {
  cover: 1,
  about: 2,
  projectsSwe: 3,
  projectsAi: 4,
  games: 5,
  experience: 6,
  skills: 7,
  education: 8,
  certifications: 9,
  achievements: 10,
  contact: 11,
} as const

const TOTAL = Object.keys(PAGE).length
const SITE = 'trookish.github.io/turki-alshaalan-portfolio'

const short = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

const groupOf = (discipline: Discipline) => projects.filter((p) => p.disciplines[0] === discipline)

interface SectionPageProps {
  num: string
  title: string
  subtitle: string
  page: number
  part?: string
  fill?: boolean
  children: ReactNode
}

function SectionPage({ num, title, subtitle, page, part, fill, children }: SectionPageProps) {
  const { b } = useI18n()
  return (
    <section className={`pdf-page${fill ? ' pdf-page--fill' : ''}`}>
      <header className="pdf-head">
        <span className="pdf-head-num">{num}</span>
        <div className="pdf-head-text">
          <h2 className="pdf-head-title">{title}</h2>
          <p className="pdf-head-sub">{subtitle}</p>
        </div>
        {part && <span className="pdf-head-part">{part}</span>}
      </header>
      <div className="pdf-content">{children}</div>
      <footer className="pdf-foot">
        <span className="pdf-foot-name">{b(profile.name)}</span>
        <span className="pdf-foot-url">{SITE}</span>
        <span className="pdf-foot-page">
          {page} / {TOTAL}
        </span>
      </footer>
    </section>
  )
}

function InlineLink({ label, value }: { label: string; value: string }) {
  return (
    <p className="pdf-inline-link">
      <span className="pdf-label">{label}</span>
      <span>{value}</span>
    </p>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const { b } = useI18n()
  const primary = project.disciplines[0]
  return (
    <article className="pdf-project">
      <div className={`pdf-project-media ${project.coverContain ? 'contain' : ''}`}>
        <img src={project.cover} alt={b(project.title)} />
      </div>
      <div className="pdf-project-text">
        <h3 className="pdf-project-title">{b(project.title)}</h3>
        <p className="pdf-project-desc">{b(project.description)}</p>
        <div className="pdf-chips">
          <span className={`pdf-tag pdf-tag-${primary}`}>{primary.toUpperCase()}</span>
          {project.tags.slice(0, 5).map((tag) => (
            <span key={tag.en} className="pdf-chip">
              {b(tag)}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

function GroupGrid({
  discipline,
  items,
  label,
  fill,
  wide,
}: {
  discipline: Discipline
  items: Project[]
  label: string
  fill?: boolean
  wide?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className={`pdf-group${fill ? ' pdf-group--fill' : ''}${wide ? ' pdf-group--wide' : ''}`}>
      <div className="pdf-group-head">
        <span className={`pdf-group-dot pdf-group-dot-${discipline}`} aria-hidden="true" />
        <h3>{label}</h3>
        <span className="pdf-group-count">{items.length}</span>
      </div>
      <div className={`pdf-projects${wide ? ' pdf-projects--wide' : ''}`}>
        {items.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  )
}

function Cover() {
  const { t, b, lang } = useI18n()
  const contact = [
    { key: 'contact_email' as MessageKey, value: profile.email },
    { key: 'contact_phone' as MessageKey, value: profile.phone },
    { key: 'contact_location' as MessageKey, value: b(profile.location) },
    { key: 'contact_linkedin' as MessageKey, value: short(profile.linkedin) },
    { key: 'contact_github' as MessageKey, value: short(profile.github) },
    { key: 'contact_itch' as MessageKey, value: short(profile.itch) },
  ]

  const contents: { label: string; page: string }[] = [
    { label: t('nav_about'), page: String(PAGE.about) },
    { label: t('nav_projects'), page: `${PAGE.projectsSwe}–${PAGE.games}` },
    { label: t('nav_experience'), page: String(PAGE.experience) },
    { label: t('nav_skills'), page: String(PAGE.skills) },
    { label: t('nav_education'), page: String(PAGE.education) },
    { label: t('nav_certifications'), page: String(PAGE.certifications) },
    { label: t('nav_achievements'), page: String(PAGE.achievements) },
    { label: t('nav_contact'), page: String(PAGE.contact) },
  ]

  return (
    <section className="pdf-page pdf-cover">
      <div className="pdf-window">
        <span className="pdf-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="pdf-window-title">turki-alshaalan · portfolio.pdf</span>
      </div>

      <div className="pdf-cover-grid">
        <div className="pdf-cover-main">
          <p className="pdf-cover-kicker">
            <span className="pdf-cover-prompt">$</span> {t('print_document')}
          </p>
          <h1 className="pdf-cover-name">
            {b(profile.nameFirst)} <span>{b(profile.nameLast)}</span>
          </h1>
          <p className="pdf-cover-headline">{b(profile.headline)}</p>

          <ul className="pdf-cover-roles">
            {profile.disciplines.map((d) => (
              <li key={d.id} className={`pdf-tag pdf-tag-${d.id}`}>
                {b(d.label)}
              </li>
            ))}
          </ul>

          <p
            className="pdf-cover-lede"
            dangerouslySetInnerHTML={{ __html: profile.about[0].text[lang] }}
          />

          <div className="pdf-cover-block">
            <p className="pdf-label">{t('contact_details')}</p>
            <ul className="pdf-contact">
              {contact.map((row) => (
                <li key={row.key}>
                  <span className="pdf-contact-key">{t(row.key)}</span>
                  <span className="pdf-contact-val">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="pdf-cover-side">
          <div className="pdf-photo">
            <img src={profile.photo} alt={b(profile.name)} />
          </div>
          <div className="pdf-contents">
            <p className="pdf-label">{t('print_contents')}</p>
            <ol>
              {contents.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <i aria-hidden="true" />
                  <b>{row.page}</b>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <footer className="pdf-foot">
        <span className="pdf-foot-name">{b(profile.name)}</span>
        <span className="pdf-foot-url">{SITE}</span>
        <span className="pdf-foot-page">{lang === 'ar' ? 'ملف أعمال' : 'Portfolio'}</span>
      </footer>
    </section>
  )
}

function AboutPage() {
  const { t, b, lang } = useI18n()
  return (
    <SectionPage num="01" title={t('about_title')} subtitle={t('about_subtitle')} page={PAGE.about} fill>
      <div className="pdf-about-grid">
        <div className="pdf-about">
          {profile.about.map((block) => (
            <div className="pdf-block" key={block.labelKey}>
              <h3 className="pdf-label">{t(block.labelKey)}</h3>
              <p className="pdf-prose" dangerouslySetInnerHTML={{ __html: block.text[lang] }} />
            </div>
          ))}
        </div>

        <aside className="pdf-about-side">
          <div className="pdf-stats">
            {profile.stats.map((stat) => (
              <div key={stat.labelKey} className="pdf-stat">
                <span className="pdf-stat-value">{stat.value}</span>
                <span className="pdf-stat-label">{t(stat.labelKey)}</span>
              </div>
            ))}
          </div>

          <div className="pdf-disciplines">
            <p className="pdf-label">{t('about_disciplines')}</p>
            <div className="pdf-chips">
              {profile.disciplines.map((d) => (
                <span key={d.id} className={`pdf-tag pdf-tag-${d.id}`}>
                  {d.label[lang]}
                </span>
              ))}
            </div>
          </div>

          <div className="pdf-callout">
            <span className="pdf-callout-dot" aria-hidden="true" />
            <p>{t('print_availability')}</p>
            <span className="pdf-callout-meta">
              {profile.email} · {b(profile.location)}
            </span>
          </div>
        </aside>
      </div>
    </SectionPage>
  )
}

function ProjectsSwePage() {
  const { t } = useI18n()
  return (
    <SectionPage
      num="02"
      title={t('projects_title')}
      subtitle={`${t('projects_group_swe')} · ${groupOf('swe').length}`}
      page={PAGE.projectsSwe}
      part="1 / 3"
      fill
    >
      <GroupGrid discipline="swe" items={groupOf('swe')} label={t('projects_group_swe')} fill />
    </SectionPage>
  )
}

function ProjectsBothPage() {
  const { t } = useI18n()
  return (
    <SectionPage
      num="02"
      title={t('projects_title')}
      subtitle={`${t('projects_group_ai')} · ${groupOf('ai').length}`}
      page={PAGE.projectsAi}
      part="2 / 3"
      fill
    >
      <GroupGrid discipline="ai" items={groupOf('ai')} label={t('projects_group_ai')} fill wide />
    </SectionPage>
  )
}

function ProjectsGamesPage() {
  const { t } = useI18n()
  return (
    <SectionPage
      num="02"
      title={t('projects_title')}
      subtitle={`${t('projects_group_game')} · ${groupOf('game').length}`}
      page={PAGE.games}
      part="3 / 3"
      fill
    >
      <GroupGrid discipline="game" items={groupOf('game')} label={t('projects_group_game')} fill />
    </SectionPage>
  )
}

function ExperiencePage() {
  const { t, b } = useI18n()
  const stack = skillCategories.filter((c) => c.discipline !== 'core').slice(0, 3)
  const recent = projects.slice(0, 4)

  return (
    <SectionPage
      num="03"
      title={t('experience_title')}
      subtitle={t('experience_subtitle')}
      page={PAGE.experience}
      fill
    >
      <div className="pdf-exp-grid">
        {experience.map((item) => (
          <article key={item.organization.en} className="pdf-job pdf-job--wide">
            <div className="pdf-job-body">
              <div className="pdf-job-top">
                <div className="pdf-job-logo">
                  <img src={item.logo} alt="" />
                </div>
                <div className="pdf-job-id">
                  <h3 className="pdf-job-title">{b(item.title)}</h3>
                  <p className="pdf-job-org">{b(item.organization)}</p>
                </div>
                <span className="pdf-job-date">{b(item.date)}</span>
              </div>
              <div className="pdf-job-facts">
                <div className="pdf-job-fact">
                  <span className="pdf-label">{t('contact_location')}</span>
                  <span className="pdf-fact-val">{b(item.description)}</span>
                </div>
                <div className="pdf-job-fact">
                  <span className="pdf-label">{t('print_focus')}</span>
                  <span className="pdf-fact-val">
                    {profile.disciplines.map((d) => b(d.label)).join(' · ')}
                  </span>
                </div>
                <div className="pdf-job-fact">
                  <span className="pdf-label">{t('print_availability_label')}</span>
                  <span className="pdf-fact-val">{t('print_availability')}</span>
                </div>
              </div>
            </div>
          </article>
        ))}

        <div className="pdf-exp-panels">
        <div className="pdf-panel-block">
          <p className="pdf-label">{t('print_recent')}</p>
          <ul className="pdf-recent-list">
            {recent.map((p) => (
              <li key={p.id}>{b(p.title)}</li>
            ))}
          </ul>
        </div>

        <div className="pdf-panel-block">
          <p className="pdf-label">{t('print_stack')}</p>
          {stack.map((cat) => (
            <div key={cat.name.en} className="pdf-stack-row">
              <span className={`pdf-stack-name pdf-ink-${cat.discipline}`}>{b(cat.name)}</span>
              <div className="pdf-chips">
                {cat.items.slice(0, 4).map((item) => (
                  <span key={item.en} className="pdf-chip">
                    {b(item)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      <InlineLink label={t('linkedin_experience')} value={`${short(profile.linkedin)}/details/experience`} />
    </SectionPage>
  )
}

function SkillsPage() {
  const { t, b } = useI18n()
  return (
    <SectionPage num="04" title={t('skills_title')} subtitle={t('skills_subtitle')} page={PAGE.skills} fill>
      <div className="pdf-skills">
        {skillCategories.map((cat) => (
          <div key={cat.name.en} className="pdf-skill-row">
            <div className="pdf-skill-name">
              <span className={`pdf-skill-title pdf-ink-${cat.discipline}`}>{b(cat.name)}</span>
              <span className="pdf-skill-kind">
                {cat.discipline === 'core'
                  ? t('skills_core')
                  : t(`filter_${cat.discipline}` as 'filter_swe' | 'filter_ai' | 'filter_game')}
                {' · '}
                {cat.items.length}
              </span>
            </div>
            <div className="pdf-chips">
              {cat.items.map((item) => (
                <span key={item.en} className="pdf-chip">
                  {b(item)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <InlineLink label={t('linkedin_skills')} value={`${short(profile.linkedin)}/details/skills`} />
    </SectionPage>
  )
}

function EducationPage() {
  const { t, b, lang } = useI18n()
  const [onsite, online] = educationTracks
  const degree = onsite.items[0]
  const others = [...onsite.items.slice(1), ...online.items]
  const grade = degree.detail[lang]

  return (
    <SectionPage
      num="05"
      title={t('education_title')}
      subtitle={t('education_subtitle')}
      page={PAGE.education}
      fill
    >
      <article className="pdf-degree">
        <div className="pdf-degree-logo">
          <img src={degree.logo} alt="" />
        </div>
        <div className="pdf-degree-body">
          <p className="pdf-label">{t('edu_onsite')}</p>
          <h3 className="pdf-degree-title">{b(degree.degree)}</h3>
          <p className="pdf-degree-school">{b(degree.institution)}</p>
          <p className="pdf-degree-date">{b(degree.date)}</p>
          {degree.activities && degree.activities.length > 0 && (
            <div className="pdf-degree-activities">
              <p className="pdf-label">{t('edu_activities')}</p>
              {degree.activities.map((act) => (
                <p key={act.label.en} className="pdf-edu-activity">
                  <img src={act.icon} alt="" />
                  {b(act.label)}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="pdf-degree-grade">
          <span className="pdf-grade-value">{grade.replace(/^\D+/, '')}</span>
          <span className="pdf-grade-label">{grade.replace(/[\d.]+\s*/g, '').trim() || 'GPA'}</span>
        </div>
      </article>

      <div className="pdf-course-grid">
        {others.map((item, i) => (
          <article key={item.degree.en} className="pdf-course">
            <div className="pdf-course-top">
              <div className="pdf-edu-logo">
                <img src={item.logo} alt="" />
              </div>
              <p className="pdf-label">{i === 0 ? t('edu_onsite') : t('edu_online')}</p>
            </div>
            <h3 className="pdf-course-title">{b(item.degree)}</h3>
            <p className="pdf-course-school">{b(item.institution)}</p>
            <p className="pdf-course-date">{b(item.date)}</p>
            <p className="pdf-course-detail">{b(item.detail)}</p>
          </article>
        ))}
      </div>

      <InlineLink label={t('linkedin_education')} value={`${short(profile.linkedin)}/details/education`} />
    </SectionPage>
  )
}

function CertificationsPage() {
  const { t, b } = useI18n()
  return (
    <SectionPage
      num="06"
      title={t('certs_title')}
      subtitle={`${t('certs_subtitle')} · ${certifications.length}`}
      page={PAGE.certifications}
      fill
    >
      <div className="pdf-certs">
        {certifications.map((cert) => (
          <article key={cert.id} className="pdf-cert">
            <div className="pdf-cert-media">
              <img src={cert.image} alt={b(cert.title)} />
            </div>
            <h3>{b(cert.title)}</h3>
            <p className="pdf-cert-issuer">{b(cert.issuer)}</p>
            <p className="pdf-cert-date">{b(cert.date)}</p>
          </article>
        ))}
      </div>
    </SectionPage>
  )
}

function AchievementsPage() {
  const { t, b } = useI18n()
  return (
    <SectionPage
      num="07"
      title={t('achievements_title')}
      subtitle={t('achievements_subtitle')}
      page={PAGE.achievements}
      fill
    >
      <div className="pdf-achievements">
        {achievements.map((ach) => (
          <article key={ach.id} className="pdf-achievement">
            <div className="pdf-achievement-media">
              <img src={ach.cover} alt={b(ach.title)} />
            </div>
            <div className="pdf-achievement-body">
              <div className="pdf-achievement-meta">
                <span className={`pdf-tag pdf-tag-${ach.disciplines[0]}`}>{b(ach.issuer)}</span>
                <span className="pdf-achievement-date">{b(ach.date)}</span>
              </div>
              <h3>{b(ach.title)}</h3>
              <p className="pdf-achievement-project">
                <span>{b(ach.projectLabel)}</span> {b(ach.projectTitle)}
              </p>
              <p className="pdf-achievement-desc">{b(ach.projectDesc)}</p>
              <div className="pdf-chips">
                {ach.tags.map((tag) => (
                  <span key={tag.en} className="pdf-chip">
                    {b(tag)}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  )
}

function ContactPage() {
  const { t, b, lang } = useI18n()
  const rows = [
    { key: 'contact_email' as MessageKey, value: profile.email },
    { key: 'contact_phone' as MessageKey, value: profile.phone },
    { key: 'contact_location' as MessageKey, value: b(profile.location) },
  ]
  const links = [
    { key: 'contact_linkedin' as MessageKey, value: short(profile.linkedin) },
    { key: 'contact_github' as MessageKey, value: short(profile.github) },
    { key: 'contact_itch' as MessageKey, value: short(profile.itch) },
  ]

  return (
    <SectionPage num="08" title={t('contact_title')} subtitle={t('contact_subtitle')} page={PAGE.contact} fill>
      <div className="pdf-contact-hero">
        <p className="pdf-label">{t('contact_email')}</p>
        <a className="pdf-mail" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
        <p className="pdf-contact-line">
          {profile.phone} · {b(profile.location)}
        </p>
        <p className="pdf-contact-note">{t('print_availability')}</p>
      </div>

      <div className="pdf-contact-columns">
        <div className="pdf-panel-block">
          <p className="pdf-label">{t('contact_details')}</p>
          <ul className="pdf-contact pdf-contact--big">
            {rows.map((row) => (
              <li key={row.key}>
                <span className="pdf-contact-key">{t(row.key)}</span>
                <span className="pdf-contact-val">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pdf-panel-block">
          <p className="pdf-label">{lang === 'ar' ? 'روابط' : 'Links'}</p>
          <ul className="pdf-contact pdf-contact--big">
            {links.map((row) => (
              <li key={row.key}>
                <span className="pdf-contact-key">{t(row.key)}</span>
                <span className="pdf-contact-val">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pdf-signature">
        <p className="pdf-signature-name">{b(profile.name)}</p>
        <p className="pdf-closing">{t('print_closing')}</p>
        <span className="pdf-closing-url">{SITE}</span>
      </div>
    </SectionPage>
  )
}

export function PrintDocument({ mode }: { mode: PrintMode }) {
  const { dir, lang } = useI18n()
  return (
    <div className="pdf-shell" data-mode={mode} dir={dir} lang={lang}>
      <Cover />
      <AboutPage />
      <ProjectsSwePage />
      <ProjectsBothPage />
      <ProjectsGamesPage />
      <ExperiencePage />
      <SkillsPage />
      <EducationPage />
      <CertificationsPage />
      <AchievementsPage />
      <ContactPage />
    </div>
  )
}

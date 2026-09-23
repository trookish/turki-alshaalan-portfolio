import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useOverlay } from '../ui/OverlayContext'
import { useReveal } from '../hooks/usePage'
import { projects } from '../data/projects'
import type { Discipline, Project } from '../data/types'
import type { MessageKey } from '../i18n/messages'

type Filter = 'all' | Discipline

const GROUP_ORDER: Discipline[] = ['swe', 'ai', 'game']

const linkLabelKey = {
  repo: 'view_project',
  play: 'play_game',
  release: 'latest_release',
} as const satisfies Record<string, MessageKey>

const groupTitleKey = {
  swe: 'projects_group_swe',
  ai: 'projects_group_ai',
  game: 'projects_group_game',
} as const satisfies Record<Discipline, MessageKey>

function ProjectCard({ project }: { project: Project }) {
  const { t, b } = useI18n()
  const { openProject } = useOverlay()
  const primary = project.disciplines[0]
  const soon = project.badge && (project.badge.en === 'Coming Soon' || project.badge.ar === 'قريباً')

  return (
    <article
      className={`project-card ${project.featured ? 'featured' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={b(project.title)}
      onClick={() => openProject(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openProject(project)
        }
      }}
    >
      <div className="project-media">
        <img
          src={project.cover}
          alt={b(project.title)}
          loading="lazy"
          className={project.coverContain ? 'contain' : ''}
        />
        {project.badge && <span className={`project-badge ${soon ? 'soon' : ''}`}>{b(project.badge)}</span>}
        <span className="showcase-cta">{t('showcase_cta')}</span>
      </div>
      <div className="project-body">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`tag tag-${primary}`}>{primary.toUpperCase()}</span>
          {project.disciplines
            .slice(1)
            .map((d) => (
              <span key={d} className={`tag tag-${d}`}>
                {d.toUpperCase()}
              </span>
            ))}
        </div>
        <h3 className="project-title">{b(project.title)}</h3>
        <p className="project-desc line-clamp-3">{b(project.description)}</p>
        <div className="project-tags">
          {project.tags.slice(0, 6).map((tag) => (
            <span key={tag.en} className="tag">
              {b(tag)}
            </span>
          ))}
        </div>
        {project.links && project.links.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {project.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link"
                onClick={(e) => e.stopPropagation()}
              >
                {t(linkLabelKey[link.kind])}
              </a>
            ))}
          </div>
        )}
        {project.teams && project.teams.length > 0 && (
          <div className="mt-auto pt-1">
            {project.teams.map((group, gi) => (
              <div key={gi} className="mb-1">
                <div className="font-mono text-[0.7rem] text-ink3">{group.label ? b(group.label) : t('team_members')}</div>
                <ul className="team-list">
                  {group.members.map((m) => (
                    <li key={m.name.en}>
                      <span className="team-name">{b(m.name)}</span>
                      {m.role ? ` — ${b(m.role)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export function Projects() {
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const visible = filter === 'all' ? projects : projects.filter((p) => p.disciplines.includes(filter))
    return GROUP_ORDER.map((discipline) => ({
      discipline,
      items: visible.filter((p) => p.disciplines[0] === discipline),
    })).filter((g) => g.items.length > 0)
  }, [filter])

  useReveal([filter])

  const chip = (id: Filter, label: string) => (
    <button
      key={id}
      type="button"
      className={`filter-chip ${filter === id ? `active${id === 'ai' ? '-ai' : id === 'game' ? '-game' : ''}` : ''}`}
      onClick={() => setFilter(id)}
    >
      {label}
    </button>
  )

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <section id="projects" className="reveal">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-14 md:py-20">
        <div className="section-head">
          <span className="section-num">02</span>
          <h2 className="section-title">{t('projects_title')}</h2>
        </div>
        <p className="section-subtitle">{t('projects_subtitle')}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {chip('all', t('filter_all'))}
          {chip('swe', t('filter_swe'))}
          {chip('ai', t('filter_ai'))}
          {chip('game', t('filter_game'))}
        </div>

        {total === 0 ? (
          <p className="font-mono text-ink3">{t('no_projects')}</p>
        ) : (
          <div className="project-groups">
            {groups.map((group) => (
              <section key={group.discipline} className={`project-group project-group-${group.discipline}`}>
                <h3 className="project-group-title">
                  <span className={`group-dot group-dot-${group.discipline}`} aria-hidden="true" />
                  {t(groupTitleKey[group.discipline])}
                  <span className="group-count">{group.items.length}</span>
                </h3>
                <div className="projects-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

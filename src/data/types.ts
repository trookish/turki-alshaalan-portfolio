import type { L } from '../i18n/types'

export type Discipline = 'swe' | 'ai' | 'game'

export interface TeamMember {
  name: L
  role: L
}

export interface TeamGroup {
  label?: L
  members: TeamMember[]
}

export type ProjectLinkKind = 'repo' | 'play' | 'release'

export interface ProjectLink {
  kind: ProjectLinkKind
  href: string
}

export type Slide =
  | { type: 'image'; src: string; title: L; desc: L }
  | { type: 'video'; id: string; title: L; desc: L }

export interface Project {
  id: string
  title: L
  description: L
  cover: string
  coverContain?: boolean
  disciplines: Discipline[]
  tags: L[]
  featured?: boolean
  badge?: L
  note?: L
  links?: ProjectLink[]
  teams?: TeamGroup[]
  gallery?: Slide[]
  video?: { id: string; title: L }
}

export interface SkillCategory {
  name: L
  discipline: Discipline | 'core'
  items: L[]
}

export interface ExperienceItem {
  title: L
  organization: L
  description: L
  date: L
  logo: string
  href?: string
}

export interface EducationItem {
  degree: L
  institution: L
  date: L
  detail: L
  logo: string
  activities?: { label: L; icon: string }[]
}

export interface EducationTrack {
  title: L
  items: EducationItem[]
}

export interface Certification {
  id: string
  title: L
  issuer: L
  date: L
  image: string
}

export interface Achievement {
  id: string
  title: L
  issuer: L
  date: L
  cover: string
  projectLabel: L
  projectTitle: L
  projectDesc: L
  projectImage?: string
  gallery?: Slide[]
  team?: TeamMember[]
  mentor?: TeamMember[]
  tags: L[]
  disciplines: Discipline[]
}

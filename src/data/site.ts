import type { MessageKey } from '../i18n/messages'

export interface SectionDef {
  id: string
  labelKey: MessageKey
}

export const sections: SectionDef[] = [
  { id: 'home', labelKey: 'nav_home' },
  { id: 'about', labelKey: 'nav_about' },
  { id: 'projects', labelKey: 'nav_projects' },
  { id: 'experience', labelKey: 'nav_experience' },
  { id: 'skills', labelKey: 'nav_skills' },
  { id: 'education', labelKey: 'nav_education' },
  { id: 'certifications', labelKey: 'nav_certifications' },
  { id: 'achievements', labelKey: 'nav_achievements' },
  { id: 'contact', labelKey: 'nav_contact' },
]

export const linkedinDetails = (kind: string) =>
  `https://www.linkedin.com/in/turki-alshaalan/details/${kind}`

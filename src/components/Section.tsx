import { useI18n } from '../i18n/LanguageContext'
import type { MessageKey } from '../i18n/messages'
import { LinkedInIcon } from './icons'
import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  num: string
  titleKey: MessageKey
  subtitleKey: MessageKey
  children: ReactNode
  className?: string
}

export function Section({ id, num, titleKey, subtitleKey, children, className = '' }: SectionProps) {
  const { t } = useI18n()
  return (
    <section id={id} className={`reveal ${className}`}>
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-14 md:py-20">
        <div className="section-head">
          <span className="section-num">{num}</span>
          <h2 className="section-title">{t(titleKey)}</h2>
        </div>
        <p className="section-subtitle">{t(subtitleKey)}</p>
        {children}
      </div>
    </section>
  )
}

export function LinkedInBtn({ href, labelKey }: { href: string; labelKey: MessageKey }) {
  const { t } = useI18n()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="linkedin-btn">
      <LinkedInIcon />
      {t(labelKey)}
    </a>
  )
}

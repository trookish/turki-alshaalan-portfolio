import { useI18n } from '../i18n/LanguageContext'
import type { MessageKey } from '../i18n/messages'
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      {t(labelKey)}
    </a>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useOverlay } from '../ui/OverlayContext'
import { getCaseStudy } from '../data/caseStudies'
import { projects } from '../data/projects'
import { PlateCalculator } from './PlateCalculator'

/**
 * Case-study window. A project whose repository is private points here instead of at a
 * dead GitHub URL: the page carries what the project does, what it measurably gets right,
 * and the reason the code stays closed. The calculator and video tabs appear only once
 * their assets exist (see `CaseStudy` in data/caseStudies.ts).
 */
export function CaseStudyModal() {
  const { caseStudyId, closeCaseStudy, imageView } = useOverlay()
  const { t, b } = useI18n()
  // The tab index belongs to one open study; opening another starts it at zero.
  const [tabs, setTabs] = useState({ id: caseStudyId, active: 0 })
  if (tabs.id !== caseStudyId) setTabs({ id: caseStudyId, active: 0 })
  const active = tabs.active
  const setActive = (next: number) => setTabs({ id: caseStudyId, active: next })

  const study = caseStudyId ? getCaseStudy(caseStudyId) : undefined
  const project = useMemo(() => projects.find((p) => p.id === caseStudyId), [caseStudyId])

  useEffect(() => {
    if (!study) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !imageView) closeCaseStudy()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [study, closeCaseStudy, imageView])

  if (!study || !project) return null

  const tabList = [
    ...study.sections.map((s) => ({ id: s.id, label: b(s.label) })),
    ...(study.calculator ? [{ id: 'calculator', label: t('case_sec_calculator') }] : []),
  ]
  const current = tabList[Math.min(active, tabList.length - 1)]
  const section = study.sections.find((s) => s.id === current.id)

  return (
    <div className="modal-overlay" onClick={closeCaseStudy} role="presentation">
      <div
        className="modal-window case-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-title"
      >
        <div className="modal-bar">
          <span className="case-eyebrow">{t('case_eyebrow')}</span>
          <button type="button" className="modal-close" onClick={closeCaseStudy} aria-label={t('case_close')}>
            ✕
          </button>
        </div>

        <div className="case-scroll">
          <header className="case-head">
            <h2 id="case-title" className="case-title">
              {b(project.title)}
            </h2>
            <p className="case-summary">{b(study.summary)}</p>
          </header>

          <nav className="case-nav" aria-label={t('case_eyebrow')}>
            {tabList.map((tab, i) => (
              <button
                key={tab.id}
                type="button"
                className={`case-tab ${i === active ? 'is-active' : ''} ${tab.id === 'calculator' ? 'is-calc' : ''}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={() => setActive(i)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {current.id === 'calculator' ? (
            <PlateCalculator />
          ) : (
            section && (
              <section className="case-section" aria-labelledby="case-sec-title">
                <h3 id="case-sec-title" className="case-section-title">
                  {b(section.label)}
                </h3>
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="case-para">
                    {b(p)}
                  </p>
                ))}
                {section.facts && section.facts.length > 0 && (
                  <dl className="case-facts">
                    {section.facts.map((f) => (
                      <div key={f.label.en} className="case-fact">
                        <dt>{b(f.label)}</dt>
                        <dd>{b(f.value)}</dd>
                        {f.note && <p className="case-fact-note">{b(f.note)}</p>}
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )
          )}

          <aside className="case-privacy">
            <h3 className="case-privacy-title">{t('case_privacy_label')}</h3>
            <p className="case-para">{b(study.privacy)}</p>
          </aside>
        </div>
      </div>
    </div>
  )
}

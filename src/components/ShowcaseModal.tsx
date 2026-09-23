import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useOverlay } from '../ui/OverlayContext'
import type { ShowcaseState } from '../ui/OverlayContext'
import type { Slide } from '../data/types'

function Thumb({ slide, label }: { slide: Slide; label: string }) {
  if (slide.type === 'video') {
    return (
      <span className="grid h-full w-full place-items-center bg-black text-[0.6rem] text-green">
        ▶ {label}
      </span>
    )
  }
  return <img src={slide.src} alt="" loading="lazy" />
}

function ShowcaseContent({ showcase, close }: { showcase: ShowcaseState; close: () => void }) {
  const { t, b } = useI18n()
  const { openImageView, imageView } = useOverlay()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (imageView) return
        close()
      }
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % showcase.slides.length)
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + showcase.slides.length) % showcase.slides.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showcase, close, imageView])

  const slide = showcase.slides[Math.min(idx, showcase.slides.length - 1)]
  const hasVideo = slide.type === 'video'

  return (
    <div className="modal-overlay" onClick={close} role="presentation">
      <div
        className="modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={showcase.title}
      >
        <div className="modal-bar">
          <span>{showcase.title}</span>
          <button type="button" className="modal-close" onClick={close} aria-label={t('sc_close_a11y')}>
            {t('sc_close')}
          </button>
        </div>

        <div className="ss-grid">
          <div className="ss-media">
            <div className="ss-stage">
              <span className="crt-lines" aria-hidden="true" />
              {slide.type === 'image' ? (
                <img src={slide.src} alt={b(slide.title)} />
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${slide.id}`}
                  title={b(slide.title)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {showcase.slides.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ss-nav ss-prev"
                    aria-label={t('sc_prev')}
                    onClick={() => setIdx((i) => (i - 1 + showcase.slides.length) % showcase.slides.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="ss-nav ss-next"
                    aria-label={t('sc_next')}
                    onClick={() => setIdx((i) => (i + 1) % showcase.slides.length)}
                  >
                    ›
                  </button>
                </>
              )}
              {slide.type === 'image' && (
                <button
                  type="button"
                  className="ss-nav ss-zoom"
                  aria-label={t('sc_view_full')}
                  onClick={(e) => {
                    e.stopPropagation()
                    openImageView({
                      src: slide.src,
                      title: b(slide.title),
                      desc: b(slide.desc),
                    })
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{t('sc_view_full')}</span>
                </button>
              )}
            </div>
            <div className="ss-caption">
              <span className="ss-title">{b(slide.title)}</span>
              <span className="ss-count">
                {idx + 1} / {showcase.slides.length}
              </span>
            </div>
            <p className="ss-desc">{b(slide.desc)}</p>

            {showcase.slides.length > 1 && (
              <div className="ss-thumbs">
                {showcase.slides.map((s, i) => (
                  <button
                    key={`${s.type}-${i}`}
                    type="button"
                    className={`ss-thumb ${i === idx ? 'active' : ''}`}
                    onClick={() => setIdx(i)}
                    aria-label={b(s.title)}
                  >
                    <Thumb slide={s} label={t('sc_gameplay_video')} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ss-details">
            <p className="ss-label">{t('sc_description')}</p>
            <p className="ss-desc-para">{showcase.description}</p>
            {hasVideo && (
              <>
                <p className="ss-label">{t('sc_gameplay_video')}</p>
                <p className="ss-desc-para">{b(slide.desc)}</p>
              </>
            )}

            {showcase.tech.length > 0 && (
              <>
                <p className="ss-label">{t('sc_tech_stack')}</p>
                <div className="project-tags">
                  {showcase.tech.map((tech) => (
                    <span key={tech} className="tag">
                      {tech}
                    </span>
                  ))}
                </div>
              </>
            )}

            {showcase.teams.length > 0 && (
              <>
                <p className="ss-label">{t('sc_team')}</p>
                {showcase.teams.map((group, gi) => (
                  <div key={gi} style={{ marginBottom: '0.75rem' }}>
                    <p className="ss-desc-para" style={{ margin: 0 }}>
                      {group.label}
                    </p>
                    <ul className="team-list">
                      {group.members.map((m) => (
                        <li key={m.name}>
                          <span className="team-name">{m.name}</span>
                          {m.role ? ` — ${m.role}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}

            {showcase.tags.length > 0 && (
              <>
                <p className="ss-label">{t('sc_tags')}</p>
                <div className="project-tags">
                  {showcase.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}

            {showcase.note && (
              <>
                <p className="ss-label">NOTE</p>
                <p className="ss-desc-para">{showcase.note}</p>
              </>
            )}

            {showcase.links.length > 0 && (
              <div className="ss-actions">
                {showcase.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Mounted only while a showcase is open — fresh slide index per open. */
export function ShowcaseModal() {
  const { showcase, closeShowcase } = useOverlay()
  if (!showcase) return null
  return <ShowcaseContent showcase={showcase} close={closeShowcase} />
}

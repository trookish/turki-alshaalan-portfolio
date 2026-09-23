import { useEffect } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useOverlay } from '../ui/OverlayContext'

export function CertModal() {
  const { t, b } = useI18n()
  const { cert, closeCert, openImageView } = useOverlay()

  useEffect(() => {
    if (!cert) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCert()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cert, closeCert])

  if (!cert) return null

  const title = b(cert.title)
  const desc = `${b(cert.issuer)} · ${b(cert.date)}`

  return (
    <div className="modal-overlay" onClick={closeCert} role="presentation">
      <div
        className="modal-window"
        style={{ width: 'auto', maxWidth: '100%', background: 'transparent', border: 0, boxShadow: 'none' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          className="modal-close"
          onClick={closeCert}
          aria-label={t('sc_close_a11y')}
          style={{ position: 'fixed', top: '1rem', insetInlineEnd: '1rem', zIndex: 5 }}
        >
          {t('sc_close')}
        </button>
        <button
          type="button"
          className="cert-open-view"
          onClick={() => openImageView({ src: cert.image, title, desc })}
          aria-label={t('sc_view_full')}
        >
          {t('sc_view_full')}
        </button>
        <img className="cert-zoom-img" src={cert.image} alt={title} />
        <p className="cert-caption">
          {title} — {desc}
        </p>
      </div>
    </div>
  )
}

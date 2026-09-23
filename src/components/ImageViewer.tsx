import { useEffect } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useOverlay } from '../ui/OverlayContext'

export function ImageViewer() {
  const { t } = useI18n()
  const { imageView, closeImageView } = useOverlay()

  useEffect(() => {
    if (!imageView) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeImageView()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [imageView, closeImageView])

  if (!imageView) return null

  return (
    <div className="modal-overlay image-viewer-overlay" onClick={closeImageView} role="presentation">
      <div
        className="image-viewer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={imageView.title || t('sc_view_full')}
      >
        <button
          type="button"
          className="image-viewer-close"
          onClick={closeImageView}
          aria-label={t('sc_close_a11y')}
        >
          {t('sc_close')}
        </button>
        <img className="image-viewer-img" src={imageView.src} alt={imageView.title || ''} />
        {(imageView.title || imageView.desc) && (
          <div className="image-viewer-caption">
            {imageView.title && <span className="image-viewer-title">{imageView.title}</span>}
            {imageView.desc && <p className="image-viewer-desc">{imageView.desc}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

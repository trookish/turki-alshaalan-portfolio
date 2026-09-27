import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useTheme } from '../theme/ThemeProvider'
import { useActiveSection, useScrolled } from '../hooks/usePage'
import { sections } from '../data/site'
import { profile } from '../data/profile'

interface NavBarProps {
  onOpenPalette: () => void
  onPlayGame: () => void
}

export function NavBar({ onOpenPalette, onPlayGame }: NavBarProps) {
  const { t, b, toggle } = useI18n()
  const { toggle: toggleTheme } = useTheme()
  const scrolled = useScrolled(10)
  const ids = useMemo(() => sections.map((s) => s.id), [])
  const active = useActiveSection(ids)
  const [menuOpen, setMenuOpen] = useState(false)
  const tabsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>('.nav-tab.active')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  // Mobile menu: close on outside tap / Escape, and lock the page behind it.
  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest('.navbar')) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onResize = () => {
      if (window.innerWidth > 860) setMenuOpen(false)
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  const go = (id: string) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <nav className="nav-inner" aria-label="Primary">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault()
            go('home')
          }}
          className="nav-brand font-mono text-[0.82rem] font-bold tracking-tight text-green"
        >
          {b(profile.name)}
        </a>

        <div id="site-menu" ref={tabsRef} className={`nav-tabs ${menuOpen ? 'open' : ''}`}>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`nav-tab ${active === s.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                go(s.id)
              }}
            >
              {t(s.labelKey)}
            </a>
          ))}

          <div className="nav-extras">
            <a
              href={profile.cv}
              download={profile.cvDownloadName}
              className="nav-extra"
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">⤓</span> {t('nav_cv_tip')}
            </a>
            <button
              type="button"
              className="nav-extra"
              onClick={() => {
                setMenuOpen(false)
                window.print()
              }}
            >
              <span aria-hidden="true">⎙</span> {t('nav_pdf_tip')}
            </button>
            <button
              type="button"
              className="nav-extra"
              onClick={() => {
                setMenuOpen(false)
                onOpenPalette()
              }}
            >
              <span aria-hidden="true">⌘</span> {t('nav_palette_tip')}
            </button>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-extra"
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">in</span> LinkedIn
            </a>
          </div>
        </div>

        <div className="nav-controls">
          <a
            href={profile.cv}
            download={profile.cvDownloadName}
            className="icon-btn nav-secondary"
            title={t('nav_cv_tip')}
          >
            <span aria-hidden="true">⤓</span>
            <span className="btn-label">{t('nav_cv')}</span>
          </a>
          <button
            type="button"
            className="icon-btn nav-secondary"
            title={t('nav_pdf_tip')}
            onClick={() => window.print()}
          >
            <span aria-hidden="true">⎙</span>
            <span className="btn-label">{t('nav_pdf')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t('nav_theme_tip')}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">◐</span>
            <span className="btn-label">{t('nav_theme')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t('nav_lang_tip')}
            onClick={toggle}
          >
            <span aria-hidden="true">文</span>
            <span className="btn-label">{t('nav_lang')}</span>
          </button>
          <button
            type="button"
            className="icon-btn play-btn"
            title={t('nav_play')}
            onClick={onPlayGame}
          >
            <img src="images/Game/Play.webp" alt="" width={18} height={18} />
          </button>
          <button
            type="button"
            className="icon-btn nav-secondary"
            title={t('nav_palette_tip')}
            onClick={() => {
              setMenuOpen(false)
              onOpenPalette()
            }}
          >
            <span aria-hidden="true">⌘</span>
            <span className="btn-label">K</span>
          </button>
          <button
            type="button"
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            aria-label="Menu"
            aria-controls="site-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>
    </header>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { useTheme } from '../theme/ThemeProvider'
import { useOverlay } from '../ui/OverlayContext'
import { sections } from '../data/site'
import { projects } from '../data/projects'

interface Cmd {
  id: string
  label: string
  kind: 'section' | 'project' | 'action'
  run: () => void
}

/** Mounted only while open — fresh state on every open. */
export function CommandPalette() {
  const { t, b, toggle } = useI18n()
  const { toggle: toggleTheme } = useTheme()
  const overlay = useOverlay()
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const close = overlay.closePalette

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = sections.map((s) => ({
      id: `sec-${s.id}`,
      label: t(s.labelKey),
      kind: 'section',
      run: () => {
        close()
        document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
      },
    }))
    for (const p of projects) {
      list.push({
        id: `proj-${p.id}`,
        label: b(p.title),
        kind: 'project',
        run: () => {
          close()
          overlay.openProject(p)
        },
      })
    }
    list.push(
      {
        id: 'act-theme',
        label: t('palette_toggle_theme'),
        kind: 'action',
        run: () => {
          toggleTheme()
          close()
        },
      },
      {
        id: 'act-lang',
        label: t('palette_toggle_lang'),
        kind: 'action',
        run: () => {
          toggle()
          close()
        },
      },
      {
        id: 'act-pdf',
        label: t('palette_export_pdf'),
        kind: 'action',
        run: () => {
          close()
          window.setTimeout(() => window.print(), 100)
        },
      },
      {
        id: 'act-game',
        label: t('palette_play_game'),
        kind: 'action',
        run: () => {
          close()
          overlay.setGameOpen(true)
        },
      },
    )
    return list
  }, [t, b, toggle, toggleTheme, overlay, close])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cmds
    return cmds.filter((c) => c.label.toLowerCase().includes(q))
  }, [cmds, query])

  const kindLabel = (k: Cmd['kind']) =>
    k === 'section' ? t('palette_sections') : k === 'project' ? t('palette_projects') : t('palette_actions')

  return (
    <div className="palette-overlay" onClick={close} role="presentation">
      <div
        className="palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          value={query}
          placeholder={t('palette_placeholder')}
          onChange={(e) => {
            setQuery(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(s + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(s - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              filtered[sel]?.run()
            }
          }}
        />
        <ul>
          {filtered.length === 0 && <li className="px-3 py-3 text-sm text-ink3">{t('palette_empty')}</li>}
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={i === sel ? 'sel' : ''}
                onMouseEnter={() => setSel(i)}
                onClick={() => c.run()}
              >
                <span>{c.label}</span>
                <span className="kind">{kindLabel(c.kind)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

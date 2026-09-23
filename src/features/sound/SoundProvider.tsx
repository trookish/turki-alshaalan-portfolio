import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface SoundValue {
  enabled: boolean
  toggle: () => void
  play: (name: 'hover' | 'click') => void
}

const SoundContext = createContext<SoundValue | null>(null)

const base = import.meta.env.BASE_URL

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('sound') !== 'false')
  const lastHover = useRef<Element | null>(null)
  const lastHoverAt = useRef(0)

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('soundToggle', { detail: { enabled } }))
  }, [enabled])

  const play = useCallback((name: 'hover' | 'click') => {
    if (!enabled) return
    const path = name === 'hover' ? 'Sounds/Normal/Hover.wav' : 'Sounds/Normal/Click.wav'
    const volume = name === 'hover' ? 0.14 : 0.3
    const el = new Audio(`${base}${path}`)
    el.volume = volume
    el.playbackRate = 0.8 + Math.random() * 0.4
    void el.play().catch(() => {})
  }, [enabled])

  useEffect(() => {
    const HOVER_SCOPE =
      'a, button, [role="button"], .nav-tab, .filter-chip, .project-card, .cert-card, .ach-card, .exp-card, .edu-card, .status-chip, .sound-fab, .btn'
    const HOVER_COOLDOWN_MS = 90

    const onOver = (e: Event) => {
      const target = e.target as Element | null
      if (!target || !(target instanceof Element)) return

      const next = target.closest(HOVER_SCOPE)
      if (!next) return
      if (lastHover.current === next) return

      const now = performance.now()
      if (now - lastHoverAt.current < HOVER_COOLDOWN_MS) {
        lastHover.current = next
        return
      }

      lastHover.current = next
      lastHoverAt.current = now
      play('hover')
    }

    const onClick = (e: Event) => {
      const target = e.target as Element | null
      if (!target || !(target instanceof Element)) return
      if (!target.closest(HOVER_SCOPE)) return
      play('click')
    }

    const onLeave = () => {
      lastHover.current = null
    }

    const onOut = (e: Event) => {
      if (!(e as PointerEvent).relatedTarget) onLeave()
    }

    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('pointerout', onOut, true)

    return () => {
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerout', onOut, true)
    }
  }, [play])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      localStorage.setItem('sound', String(next))
      return next
    })
  }, [])

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound(): SoundValue {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used within SoundProvider')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PrintDialog } from './PrintDialog'
import { PrintDocument } from './PrintDocument'

export type PrintMode = 'theme' | 'paper'

interface PrintValue {
  dialogOpen: boolean
  open: () => void
  close: () => void
  preparing: PrintMode | null
  run: (mode: PrintMode) => void
}

const PrintContext = createContext<PrintValue | null>(null)

/** `?print=theme` / `?print=paper` renders the export layout on its own. */
function readPreview(): PrintMode | null {
  const value = new URLSearchParams(window.location.search).get('print')
  return value === 'theme' || value === 'paper' ? value : null
}

const nextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/** Print can start before images are decoded; wait for them, but never hang the click. */
async function waitForArtwork(root: HTMLElement, timeout = 8000) {
  const pending = Array.from(root.querySelectorAll('img')).map((img) =>
    img.complete && img.naturalWidth > 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
  )
  await Promise.race([Promise.all(pending), delay(timeout)])
}

export function PrintProvider({ children }: { children: ReactNode }) {
  const preview = useMemo(() => readPreview(), [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<PrintMode | null>(preview)
  const [preparing, setPreparing] = useState<PrintMode | null>(null)
  const busy = useRef(false)

  // A `?print=` link shows the sheet layout on screen instead of the site.
  useEffect(() => {
    if (!preview) return
    document.documentElement.dataset.printview = preview
    return () => {
      delete document.documentElement.dataset.printview
    }
  }, [preview])

  const open = useCallback(() => setDialogOpen(true), [])
  const close = useCallback(() => setDialogOpen(false), [])

  // The browser's own print shortcut opens the layout picker, so visitors never
  // get the unstyled site dump.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setDialogOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const run = useCallback(
    async (next: PrintMode) => {
      if (busy.current) return
      busy.current = true
      setPreparing(next)
      setMode(next)
      document.documentElement.dataset.printmode = next

      const printed = new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          window.removeEventListener('afterprint', finish)
          window.clearTimeout(timer)
          resolve()
        }
        const timer = window.setTimeout(finish, 5000)
        window.addEventListener('afterprint', finish)
      })

      try {
        await nextPaint()
        await document.fonts?.ready
        const shell = document.querySelector<HTMLElement>('.pdf-shell')
        if (shell) await waitForArtwork(shell)
        window.print()
        await printed
      } finally {
        busy.current = false
        setPreparing(null)
        setDialogOpen(false)
        if (!preview) {
          setMode(null)
          delete document.documentElement.dataset.printmode
        }
      }
    },
    [preview],
  )

  const value = useMemo<PrintValue>(
    () => ({ dialogOpen, open, close, preparing, run }),
    [dialogOpen, open, close, preparing, run],
  )

  return (
    <PrintContext.Provider value={value}>
      {children}
      {mode && createPortal(<PrintDocument mode={mode} />, document.body)}
      {dialogOpen && <PrintDialog />}
    </PrintContext.Provider>
  )
}

export function usePrint(): PrintValue {
  const ctx = useContext(PrintContext)
  if (!ctx) throw new Error('usePrint must be used within PrintProvider')
  return ctx
}

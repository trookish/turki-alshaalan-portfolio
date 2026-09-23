import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { messages, type MessageKey } from './messages'
import { pick, type L, type Lang } from './types'

interface LanguageValue {
  lang: Lang
  dir: 'ltr' | 'rtl'
  t: (key: MessageKey) => string
  b: (str: L) => string
  toggle: () => void
}

const LanguageContext = createContext<LanguageValue | null>(null)

function readLang(): Lang {
  const saved = localStorage.getItem('lang')
  return saved === 'ar' ? 'ar' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang)

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }, [lang, dir])

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'ar' : 'en'
      localStorage.setItem('lang', next)
      return next
    })
  }, [])

  const t = useCallback((key: MessageKey) => pick(messages[key], lang), [lang])
  const b = useCallback((str: L) => pick(str, lang), [lang])

  const value = useMemo(
    () => ({ lang, dir, t, b, toggle }),
    [lang, dir, t, b, toggle],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n(): LanguageValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}

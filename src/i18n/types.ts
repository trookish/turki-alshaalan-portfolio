export type Lang = 'en' | 'ar'

export interface L {
  en: string
  ar: string
}

export function pick(str: L, lang: Lang): string {
  return str[lang]
}

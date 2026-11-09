/**
 * Browser inference for the Saudi plate fair-price model.
 *
 * The weights come from the project's own export (`data/plate-model.json`); this file only
 * implements the arithmetic the export specifies, so a change in the model never needs a
 * change here. Formula, from the export's `target.formula`:
 *
 *   log_price = base[market][v - 1] + T1[i1] + T2[i2] + T3[i3]
 *
 * It is a typical closing price from past auctions, not an appraisal and not an offer.
 */

export type PlateMarket = 'mvp' | 'auction'

export interface PlateModel {
  model_version: string
  trained_through: string
  n_out_of_fold: number
  caveat: string
  input: { market: PlateMarket[]; tier: string[]; plate_type: string[] }
  indexing: { tier: string[]; plate_type: string[]; shape: string }
  arabic_to_latin: Record<string, string>
  word_letters: string[]
  base: Record<PlateMarket, number[]>
  T1: number[]
  T2: number[]
  T3: number[]
  bands: Record<PlateMarket, Record<string, PlateBand>>
  reliability: Record<string, { n: number; coverage: number; typical_error_x: number }>
  production_walk_forward: { n: number; typical_error_x: number; rank_correlation: number }
  fidelity_to_production_model: { n: number; median_abs_log: number }
}

export interface PlateBand {
  likely_log: number
  wide_log: number
  group: string
  n_tested: number
  typical_error_x: number
}

export interface PlateInput {
  number: string
  letters: string
  market: PlateMarket
  tier?: string
  plateType?: string
}

export interface PlateEstimate {
  ok: true
  price: number
  likely: { low: number; high: number }
  wide: { low: number; high: number }
  digits: number
  letters: string
  value: number
  band: PlateBand
  caveat: string
}

export interface PlateError {
  ok: false
  error: 'invalid_plate' | 'no_band' | 'invalid_letters' | 'empty'
}

const GRID = 500
const TIER_ORDER = ['none', '0', '1', '2', '3', '4']
const TYPE_ORDER = ['none', '21', '22', '23', '1', '10']
const MARKET_INDEX: Record<PlateMarket, number> = { mvp: 0, auction: 1 }
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'

export function normalizeDigits(raw: string): number | null {
  const ascii = String(raw)
    .replace(/[٠-٩۰-۹]/g, (ch) => String(ARABIC_DIGITS.indexOf(ch) % 10))
    .replace(/[\s,.-]/g, '')
  if (!/^\d{1,4}$/.test(ascii)) return null
  const value = Number(ascii)
  return value > 0 ? value : null
}

export function normalizeLetters(model: PlateModel, raw: string): string | null {
  const stripped = String(raw)
    .replace(/[\s-]/g, '')
    .toUpperCase()
  if (!stripped) return null
  const map = model.arabic_to_latin
  const arabic = Array.from(String(raw).replace(/[\s-]/g, ''))
  const latin = arabic.every((ch) => ch in map) ? arabic.map((ch) => map[ch]).join('') : stripped
  if (!/^[A-Z]{1,3}$/.test(latin)) return null
  // The model only knows the Saudi letter set; anything else is not a plate.
  const known = new Set(Object.values(map))
  return Array.from(latin).every((ch) => known.has(ch)) ? latin : null
}

function bucketOf(value: number): number {
  if (value < 10) return 0
  if (value < 100) return 1
  if (value < 1000) return 2
  if (value < 2000) return 3
  if (value < 5000) return 4
  return 5
}

function shapeOf(model: PlateModel, letters: string): number {
  const chars = Array.from(letters)
  const unique = new Set(chars)
  const count = Math.min(chars.length, 3)
  const repeated = unique.size < chars.length ? 1 : 0
  const allSame = unique.size === 1 ? 1 : 0
  const ascending = chars.join('') === chars.slice().sort().join('') && unique.size === chars.length ? 1 : 0
  const spells = model.word_letters.includes(letters) ? 1 : 0
  return ((((count - 1) * 2 + repeated) * 2 + allSame) * 2 + ascending) * 2 + spells
}

function snapBand(low: number, high: number): [number, number] {
  let lo = Math.ceil(low / GRID - 1e-9) * GRID
  let hi = Math.floor(high / GRID + 1e-9) * GRID
  if (lo > hi) {
    lo = Math.floor(low / GRID + 1e-9) * GRID
    hi = Math.ceil(high / GRID - 1e-9) * GRID
  }
  return [Math.max(lo, GRID), Math.max(hi, GRID)]
}

export function estimatePlate(model: PlateModel, input: PlateInput): PlateEstimate | PlateError {
  const value = normalizeDigits(input.number)
  if (value === null) return { ok: false, error: 'invalid_plate' }
  const letters = normalizeLetters(model, input.letters)
  if (letters === null) return { ok: false, error: 'invalid_letters' }

  const market = input.market
  const digits = String(value).length
  const band = model.bands[market]?.[String(digits)]
  if (!band) return { ok: false, error: 'no_band' }

  const tierIndex = Math.max(0, TIER_ORDER.indexOf(input.tier ?? 'none'))
  const typeIndex = Math.max(0, TYPE_ORDER.indexOf(input.plateType ?? 'none'))
  const bucket = bucketOf(Math.min(value, 9999))
  const shape = shapeOf(model, letters)

  const i1 = ((MARKET_INDEX[market] * 6 + bucket) * 6 + tierIndex) * 6 + typeIndex
  const i2 = (MARKET_INDEX[market] * 6 + bucket) * 48 + shape
  const i3 = (tierIndex * 6 + typeIndex) * 48 + shape

  const logPrice =
    model.base[market][Math.min(value, model.base[market].length) - 1] +
    (model.T1[i1] ?? 0) +
    (model.T2[i2] ?? 0) +
    (model.T3[i3] ?? 0)

  const [likelyLow, likelyHigh] = snapBand(
    Math.exp(logPrice - band.likely_log),
    Math.exp(logPrice + band.likely_log),
  )
  const [wideLow, wideHigh] = snapBand(
    Math.exp(logPrice - band.wide_log),
    Math.exp(logPrice + band.wide_log),
  )

  let price = Math.max(GRID, Math.round(Math.exp(logPrice) / GRID) * GRID)
  price = Math.min(Math.max(price, likelyLow), likelyHigh)

  return {
    ok: true,
    price,
    likely: { low: likelyLow, high: likelyHigh },
    wide: { low: wideLow, high: wideHigh },
    digits,
    letters,
    value,
    band,
    caveat: model.caveat,
  }
}

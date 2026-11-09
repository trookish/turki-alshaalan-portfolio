/**
 * Thin wrapper over the project's own browser build (`predict.js`, shipped verbatim from
 * the export). The tree walk, the feature vector and the rounding rules live there; this
 * file only turns its string errors into codes the UI can localise.
 *
 * The model prices a typical closing price from past Absher auctions and marketplace
 * listings. It is not an appraisal and not an offer.
 */
import { predictPlate } from './predict'
import type { PlateModelBand, PlateModelJson } from './predict'

export type PlateMarket = 'mvp' | 'auction'

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
  band: Pick<PlateModelBand, 'group' | 'n_tested' | 'typical_error_x'>
  caveat: string
}

export interface PlateError {
  ok: false
  error: 'invalid_plate' | 'invalid_letters' | 'no_band'
}

export function estimatePlate(model: PlateModelJson, input: PlateInput): PlateEstimate | PlateError {
  const result = predictPlate(model, {
    number: input.number,
    letters: input.letters,
    market: input.market,
    tier: input.tier,
    plate_type: input.plateType,
  })

  if (!result.ok) {
    const lettersProblem = /letter/i.test(result.error)
    const bandProblem = /digit plates/i.test(result.error)
    return { ok: false, error: bandProblem ? 'no_band' : lettersProblem ? 'invalid_letters' : 'invalid_plate' }
  }

  return {
    ok: true,
    price: result.price,
    likely: result.likely,
    wide: result.wide,
    digits: result.digits,
    letters: result.letters,
    value: Number(result.number),
    band: { group: result.group, n_tested: result.n_tested, typical_error_x: result.typical_error_x },
    caveat: result.caveat,
  }
}

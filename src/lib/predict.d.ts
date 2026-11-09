// Types for @platelab's browser build (src/lib/predict.js), shipped verbatim from the
// export so the inference stays byte-identical to the one the project verified.

export interface PlateModelTree {
  f: number[]
  t: number[]
  l: number[]
  r: number[]
}

export interface PlateModelBand {
  likely_log: number
  wide_log: number
  group: string
  n_tested: number
  typical_error_x: number
}

export interface PlateModelJson {
  schema: string
  model_version: string
  trained_through: string
  n_training_rows: number
  n_out_of_fold: number
  n_trees: number
  caveat: string
  feature_order: string[]
  trees: PlateModelTree[]
  word_letters: string[]
  arabic_to_latin: Record<string, string>
  input: { market: string[]; tier: string[]; plate_type: string[] }
  bands: Record<string, Record<string, PlateModelBand>>
  production_walk_forward: {
    n: number
    typical_error_x: number
    p80_error_x: number
    rank_correlation: number
    gain_vs_segment: number
  }
  export_walk_forward: {
    n: number
    typical_error_x: number
    p80_error_x: number
    rank_correlation: number
    gain_vs_segment: number
  }
  reliability: Record<string, { n: number; coverage: number; typical_error_x: number }>
}

export interface PredictInput {
  number: string
  letters: string
  market?: 'mvp' | 'auction'
  tier?: string
  plate_type?: string
}

export type PredictResult =
  | {
      ok: true
      market: string
      number: string
      letters: string
      digits: number
      log_price: number
      price: number
      likely: { low: number; high: number }
      wide: { low: number; high: number }
      group: string
      n_tested: number
      typical_error_x: number
      caveat: string
    }
  | { ok: false; error: string }

export function normalizePlate(
  model: PlateModelJson,
  number: string,
  letters: string,
): { error: string } | { value: number; digits: string; letters: string }

export function predictPlate(model: PlateModelJson, input: PredictInput): PredictResult

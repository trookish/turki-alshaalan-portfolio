import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { estimatePlate } from '../lib/plateModel'
import type { PlateMarket } from '../lib/plateModel'
import type { PlateModelJson } from '../lib/predict'

const LETTERS = ['A', 'B', 'D', 'E', 'G', 'H', 'J', 'K', 'L', 'N', 'R', 'S', 'T', 'U', 'V', 'X', 'Z']
const TIERS = ['none', '0', '1', '2', '3', '4']
const TYPES = ['none', '21', '22', '23', '1', '10']

/**
 * The product's calculator, rebuilt to run on this page. The weights are the project's own
 * export, loaded lazily so the model never weighs on the first paint of the site.
 */
export function PlateCalculator() {
  const { t, lang } = useI18n()
  const [model, setModel] = useState<PlateModelJson | null>(null)
  const [digits, setDigits] = useState('66')
  const [printed, setPrinted] = useState<[string, string, string]>(['X', 'R', 'Z'])
  const [market, setMarket] = useState<PlateMarket>('mvp')
  const [tier, setTier] = useState('none')
  const [plateType, setPlateType] = useState('none')
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    let alive = true
    import('../data/plate-model.json').then((mod) => {
      if (alive) setModel(mod.default as unknown as PlateModelJson)
    })
    return () => {
      alive = false
    }
  }, [])

  const result = useMemo(() => {
    if (!model) return null
    if (!digits.trim()) return { ok: false as const, error: 'empty' as const }
    return estimatePlate(model, {
      number: digits,
      letters: printed.filter(Boolean).join(''),
      market,
      tier,
      plateType,
    })
  }, [model, digits, printed, market, tier, plateType])

  const num = (n: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US').format(n)
  const currency = lang === 'ar' ? 'ريال' : 'SAR'
  const shown = printed.join('')

  return (
    <div className="calc">
      <p className="calc-note">{t('calc_note')}</p>

      <div className="calc-plate" aria-hidden="true">
        <div className="calc-plate-half calc-plate-digits">
          <span className="calc-plate-value">{digits || '—'}</span>
          <span className="calc-plate-label">رقم</span>
        </div>
        <div className="calc-plate-half calc-plate-letters">
          <span className="calc-plate-value">{shown || '—'}</span>
          <span className="calc-plate-label">حروف</span>
        </div>
      </div>

      <div className="calc-fields">
        <label className="calc-field">
          <span className="calc-label">{t('calc_digits')}</span>
          <input
            className="calc-input"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/[^\d٠-٩۰-۹]/g, '').slice(0, 4))}
            placeholder="66"
          />
        </label>

        <div className="calc-field">
          <span className="calc-label">{t('calc_letters')}</span>
          <div className="calc-letter-row">
            {[0, 1, 2].map((i) => (
              <select
                key={i}
                className="calc-select calc-select-letter"
                aria-label={`${t('calc_letters')} ${i + 1}`}
                value={printed[i]}
                onChange={(e) => {
                  const next = [...printed] as [string, string, string]
                  next[i] = e.target.value
                  setPrinted(next)
                }}
              >
                {i > 0 && <option value="">—</option>}
                {LETTERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <span className="calc-hint">{t('calc_printed_note')}</span>
        </div>

        <div className="calc-field">
          <span className="calc-label">{t('calc_market')}</span>
          <div className="calc-seg" role="group" aria-label={t('calc_market')}>
            {(['mvp', 'auction'] as PlateMarket[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`calc-seg-btn ${market === m ? 'is-active' : ''}`}
                aria-pressed={market === m}
                onClick={() => setMarket(m)}
              >
                {t(m === 'mvp' ? 'calc_market_mvp' : 'calc_market_auction')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="calc-advanced-toggle"
        aria-expanded={advanced}
        onClick={() => setAdvanced((v) => !v)}
      >
        {advanced ? '▾' : '▸'} {t('calc_advanced')}
      </button>

      {advanced && (
        <div className="calc-fields calc-fields-advanced">
          <label className="calc-field">
            <span className="calc-label">{t('calc_tier')}</span>
            <select className="calc-select" value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map((v) => (
                <option key={v} value={v}>
                  {v === 'none' ? t('calc_none') : v}
                </option>
              ))}
            </select>
          </label>
          <label className="calc-field">
            <span className="calc-label">{t('calc_type')}</span>
            <select className="calc-select" value={plateType} onChange={(e) => setPlateType(e.target.value)}>
              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {v === 'none' ? t('calc_none') : v}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="calc-out" aria-live="polite">
        {!model && <p className="calc-loading">{t('calc_loading')}</p>}

        {model && result && !result.ok && (
          <p className="calc-error">
            {result.error === 'invalid_letters' ? t('calc_err_letters') : t('calc_err_plate')}
          </p>
        )}

        {model && result && result.ok && (
          <>
            <div className="calc-price-row">
              <div>
                <span className="calc-label">{t('calc_estimate')}</span>
                <p className="calc-price">
                  {num(result.price)} <span className="calc-currency">{currency}</span>
                </p>
              </div>
              <div className="calc-key">
                <span className="calc-label">{t('calc_normalised')}</span>
                <p className="calc-key-value">
                  {result.value} · {Array.from(result.letters).join(' ')}
                </p>
              </div>
            </div>

            <dl className="calc-ranges">
              <div className="calc-range">
                <dt>{t('calc_likely')}</dt>
                <dd>
                  {num(result.likely.low)} – {num(result.likely.high)}
                </dd>
              </div>
              <div className="calc-range">
                <dt>{t('calc_wide')}</dt>
                <dd>
                  {num(result.wide.low)} – {num(result.wide.high)}
                </dd>
              </div>
              <div className="calc-range">
                <dt>{t('calc_group')}</dt>
                <dd>
                  {t(market === 'mvp' ? 'calc_market_mvp' : 'calc_market_auction')} · {num(result.digits)}{' '}
                  {t('calc_digits_short')}
                </dd>
              </div>
              <div className="calc-range">
                <dt>{t('calc_tested')}</dt>
                <dd>{num(result.band.n_tested)}</dd>
              </div>
              <div className="calc-range">
                <dt>{t('calc_error')}</dt>
                <dd>×{result.band.typical_error_x}</dd>
              </div>
            </dl>

            <p className="calc-caveat">{result.caveat}</p>
            <p className="calc-caveat">{t('calc_accuracy')}</p>
            <p className="calc-meta">
              {model.model_version} · {model.trained_through.slice(0, 10)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

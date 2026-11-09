/* Saudi plate fair-price estimator — browser build.
 *
 * Walks the distilled forest in model.json. No network, no dependencies.
 * Every number it returns comes from model.json; this file only computes the
 * feature vector and copies the console's rounding rules.
 *
 *   import { predictPlate } from './predict.js';
 *   const res = predictPlate(model, { number: '66', letters: 'XRZ', market: 'mvp' });
 *   // { ok: true, price: 3500, likely: {low, high}, wide: {low, high}, ... }
 *
 * The result is a typical closing price, not an appraisal and not an offer.
 */

const GRID = 500;

function snapBand(low, high, grid = GRID) {
  let lo = Math.ceil(low / grid - 1e-9) * grid;
  let hi = Math.floor(high / grid + 1e-9) * grid;
  if (lo > hi) {
    lo = Math.floor(low / grid + 1e-9) * grid;
    hi = Math.ceil(high / grid - 1e-9) * grid;
  }
  lo = Math.max(lo, grid);
  return [lo, Math.max(hi, lo)];
}

function snapPrice(value, low, high, grid = GRID) {
  let out = Math.max(grid, Math.round(value / grid) * grid);
  if (low != null) out = Math.max(out, low);
  if (high != null) out = Math.min(out, high);
  return out;
}

const ARABIC_DIGIT_RANGE = [[0x0660, 0x0669], [0x06f0, 0x06f9]];

function toLatinDigits(text) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const range = ARABIC_DIGIT_RANGE.find(([lo, hi]) => cp >= lo && cp <= hi);
    out += range ? String(cp - range[0]) : ch;
  }
  return out;
}

/* Number features, mirroring features/plate_features.number_features on the
 * stripped digit string (leading zeros are removed before this runs). */
function numberFeatures(s, v) {
  const digits = s.split('').map(Number);
  const n = digits.length;
  const unique = new Set(digits).size;
  const allSame = unique === 1;
  const strict = unique === n;
  const asc = digits.join('') === digits.slice().sort((a, b) => a - b).join('') && strict;
  const desc = digits.join('') === digits.slice().sort((a, b) => b - a).join('') && strict;
  let seq = false;
  if (n >= 2) {
    const steps = new Set();
    for (let i = 1; i < n; i += 1) steps.add(digits[i] - digits[i - 1]);
    seq = steps.size === 1 && (steps.has(1) || steps.has(-1));
  }
  const pal = n > 1 && digits.join('') === digits.slice().reverse().join('');
  const trimmed = s.replace(/0+$/, '');
  const round = n >= 2 && trimmed !== s && trimmed !== '' && [1, 2, 5].includes(Number(trimmed));
  const yearLike = n === 4 && ((v >= 1970 && v <= 2035) || (v >= 1400 && v <= 1499));
  let aaab = false;
  let abbb = false;
  if (n === 4) {
    const [a, b, c, d] = digits;
    if (a === b && b === c && d !== a) aaab = true;
    else if (b === c && c === d && a !== b) abbb = true;
  }
  let alt = false;
  if (n >= 4 && unique === 2) {
    const [a, b] = digits;
    alt = a !== b && digits.every((d, i) => d === (i % 2 === 0 ? a : b));
  }
  const reversal = !pal && !allSame && n >= 2;
  let group = null;
  if (allSame && n > 1) group = 'A'.repeat(n);
  else if (n === 4 && digits[0] === digits[2] && digits[1] === digits[3] && digits[0] !== digits[1]) group = 'ABAB';
  else if (n === 4 && digits[0] === digits[1] && digits[2] === digits[3] && digits[0] !== digits[2]) group = 'AABB';
  let score = (4 - Math.min(n, 4)) / 4;
  if (allSame) score += 0.5;
  else if (seq || pal || group) score += 0.25;
  return {
    digits: n,
    log_value: Math.log10(v + 1),
    leading_zeros: 0,
    unique_digits: unique,
    all_same: allSame,
    ascending: asc,
    descending: desc,
    sequential: seq,
    palindrome: pal,
    round,
    has_zero: s.includes('0'),
    year_like: yearLike,
    aaab,
    abbb,
    alternating: alt,
    reversal_pair: reversal,
    numeric_rarity: Math.min(score, 1),
  };
}

function letterFeatures(latin) {
  const chars = latin.split('');
  const unique = new Set(chars).size;
  return {
    letter_count: chars.length,
    repeated_letters: unique < chars.length,
    all_letters_same: unique === 1,
    letters_ascending: chars.join('') === chars.slice().sort().join('') && unique === chars.length,
  };
}

/* Normalise a plate the way the console does: 1-4 digit characters (Arabic-Indic
 * accepted), a value above zero, 1-3 letters from the Saudi set (Arabic letters
 * map to their Latin identity). */
export function normalizePlate(model, number, letters) {
  const raw = toLatinDigits(String(number == null ? '' : number).trim());
  if (!/^\d{1,4}$/.test(raw)) return { error: 'Enter 1 to 4 digits.' };
  const value = Number(raw);
  if (value === 0) return { error: 'A plate number is never zero.' };
  const digits = String(value);
  const map = model.arabic_to_latin || {};
  const set = new Set(Object.values(map));
  let text = String(letters == null ? '' : letters).replace(/[\s-]/g, '');
  if (text) {
    const chars = Array.from(text);
    if (chars.every((ch) => ch in map)) text = chars.map((ch) => map[ch]).join('');
  }
  const latin = text.toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(latin) || !Array.from(latin).every((ch) => set.has(ch))) {
    return { error: 'Enter 1 to 3 Saudi plate letters.' };
  }
  return { value, digits, letters: latin };
}

export function features(model, plate, input) {
  const market = input.market || 'mvp';
  const table = {
    ...numberFeatures(plate.digits, plate.value),
    value_le_9: plate.value <= 9,
    value_le_99: plate.value <= 99,
    value_le_999: plate.value <= 999,
    multiple_of_100: plate.value % 100 === 0,
    multiple_of_1000: plate.value % 1000 === 0,
    ...letterFeatures(plate.letters),
    market_mvp: market === 'mvp',
    spells_known_word: (model.word_letters || []).includes(plate.letters),
    tier_0: 0,
    tier_1: 0,
    tier_2: 0,
    tier_3: 0,
    tier_4: 0,
    ptype_21: 0,
    ptype_22: 0,
    ptype_23: 0,
    ptype_1: 0,
    ptype_10: 0,
  };
  if (input.tier != null && input.tier !== '' && model.input.tier.includes(String(input.tier))) {
    table['tier_' + input.tier] = 1;
  }
  if (input.plate_type != null && input.plate_type !== '' && model.input.plate_type.includes(String(input.plate_type))) {
    table['ptype_' + input.plate_type] = 1;
  }
  return model.feature_order.map((name) => Number(table[name]) || 0);
}

export function predictPlate(model, input) {
  const market = input.market || 'mvp';
  if (!model.input.market.includes(market)) {
    return { ok: false, error: 'Market must be one of ' + model.input.market.join(', ') + '.' };
  }
  const plate = normalizePlate(model, input.number, input.letters);
  if (plate.error) return { ok: false, error: plate.error };
  const x = features(model, plate, { ...input, market });
  let sum = 0;
  for (const tree of model.trees) {
    let i = 0;
    while (tree.f[i] >= 0) i = x[tree.f[i]] <= tree.t[i] ? tree.l[i] : tree.r[i];
    sum += tree.t[i];
  }
  const logPrice = sum / model.trees.length;
  const band = (model.bands[market] || {})[String(plate.digits.length)];
  if (!band) return { ok: false, error: 'This build does not price ' + plate.digits.length + '-digit plates.' };
  const [likelyLow, likelyHigh] = snapBand(Math.exp(logPrice - band.likely_log), Math.exp(logPrice + band.likely_log));
  const [wideLow, wideHigh] = snapBand(Math.exp(logPrice - band.wide_log), Math.exp(logPrice + band.wide_log));
  return {
    ok: true,
    market,
    number: plate.digits,
    letters: plate.letters,
    digits: plate.digits.length,
    log_price: logPrice,
    price: snapPrice(Math.exp(logPrice), likelyLow, likelyHigh),
    likely: { low: likelyLow, high: likelyHigh },
    wide: { low: wideLow, high: wideHigh },
    group: band.group,
    n_tested: band.n_tested,
    typical_error_x: band.typical_error_x,
    caveat: 'Typical closing price from past Absher auctions and marketplace listings. Not an appraisal and not an offer.',
  };
}

export default predictPlate;

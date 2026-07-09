import { runSimulation } from './simulation.js'

// One-input-at-a-time sensitivity: for each input below, nudge it to a "low"
// and "high" test value (clamped to the same bounds as its slider in
// App.jsx) while holding everything else at the current values. `delta` is
// an absolute amount for rate-like inputs, or a fraction of the current
// value ('relative') for dollar-like inputs such as Home Price.
export const SENSITIVITY_INPUTS = [
  {
    key: 'homeAppreciation',
    label: 'Home Appreciation',
    delta: 1.5,
    type: 'absolute',
    min: 0,
    max: 10,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'stockReturn',
    label: 'Investment Return',
    delta: 1.5,
    type: 'absolute',
    min: 0,
    max: 15,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'mortgageRate',
    label: 'Mortgage Rate',
    delta: 1,
    type: 'absolute',
    min: 0,
    max: 12,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'rentInflation',
    label: 'Rent Inflation',
    delta: 1,
    type: 'absolute',
    min: 0,
    max: 10,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'downPaymentPct',
    label: 'Down Payment',
    delta: 10,
    type: 'absolute',
    min: 0,
    max: 100,
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: 'homePrice',
    label: 'Home Price',
    delta: 0.1,
    type: 'relative',
    min: 100000,
    max: 5000000,
    format: (v) => `$${Math.round(v).toLocaleString()}`,
  },
]

function finalAdvantage(inputs) {
  const { data } = runSimulation(inputs)
  const last = data[data.length - 1]
  return last.buyerNetWorth - last.renterNetWorth
}

// Buying Advantage = Buyer Net Worth minus Renter Net Worth at Year 30. Rows
// are sorted by the width of their low→high swing, widest first — the
// classic tornado-chart ordering.
export function runSensitivityAnalysis(inputs) {
  const baselineAdvantage = finalAdvantage(inputs)

  const rows = SENSITIVITY_INPUTS.map((cfg) => {
    const base = inputs[cfg.key]
    const delta = cfg.type === 'relative' ? base * cfg.delta : cfg.delta
    const lowValue = Math.max(cfg.min, base - delta)
    const highValue = Math.min(cfg.max, base + delta)
    return {
      key: cfg.key,
      label: cfg.label,
      lowValue,
      highValue,
      lowAdvantage: finalAdvantage({ ...inputs, [cfg.key]: lowValue }),
      highAdvantage: finalAdvantage({ ...inputs, [cfg.key]: highValue }),
      format: cfg.format,
    }
  })

  rows.sort(
    (a, b) =>
      Math.abs(b.highAdvantage - b.lowAdvantage) - Math.abs(a.highAdvantage - a.lowAdvantage),
  )

  return { baselineAdvantage, rows }
}

import { describe, expect, it } from 'vitest'
import { runMonteCarlo, simulateTrial } from './monteCarlo.js'

const baseInputs = {
  homePrice: 650000,
  monthlyRent: 2800,
  downPaymentPct: 20,
  mortgageRate: 6.5,
  propertyTaxRate: 1.1,
  monthlyHOA: 250,
  homeInsuranceAnnual: 1200,
  yearlyMaintenance: 3000,
  applyProp13Cap: true,
  sellingCostPct: 7,
  applyItemizedDeduction: true,
  marginalTaxRate: 24,
  stateTaxRate: 9.3,
  stockReturn: 7,
  investmentVehicle: 'stocks',
  homeAppreciation: 3.5,
  rentInflation: 3,
  insuranceInflation: 4,
  maintenanceInflation: 3,
  capitalGainsTaxRate: 15,
  marriedFilingJointly: true,
}

// Trial count kept modest for test speed; the assertions below only rely on
// directional/shape properties that hold reliably even with some noise.
const TEST_TRIALS = 300

describe('runMonteCarlo', () => {
  it('returns one data point per year with a valid win probability', () => {
    const result = runMonteCarlo(baseInputs, TEST_TRIALS)
    expect(result.data).toHaveLength(30)
    expect(result.trials).toBe(TEST_TRIALS)
    expect(result.buyerWinProbability).toBeGreaterThanOrEqual(0)
    expect(result.buyerWinProbability).toBeLessThanOrEqual(1)
  })

  it('keeps percentiles monotonically ordered for every year', () => {
    const { data } = runMonteCarlo(baseInputs, TEST_TRIALS)
    for (const d of data) {
      expect(d.buyerP10).toBeLessThanOrEqual(d.buyerMedian)
      expect(d.buyerMedian).toBeLessThanOrEqual(d.buyerP90)
      expect(d.renterP10).toBeLessThanOrEqual(d.renterMedian)
      expect(d.renterMedian).toBeLessThanOrEqual(d.renterP90)
    }
  })

  it('produces non-negative percentile ranges for the fan chart bands', () => {
    const { data } = runMonteCarlo(baseInputs, TEST_TRIALS)
    for (const d of data) {
      expect(d.buyerRange).toBeGreaterThanOrEqual(0)
      expect(d.renterRange).toBeGreaterThanOrEqual(0)
      expect(d.buyerLow).toBe(d.buyerP10)
      expect(d.renterLow).toBe(d.renterP10)
    }
  })

  it('gives Treasury bonds a narrower year-30 spread than stocks', () => {
    const stocks = runMonteCarlo({ ...baseInputs, investmentVehicle: 'stocks', stockReturn: 7 }, TEST_TRIALS)
    const treasuries = runMonteCarlo(
      { ...baseInputs, investmentVehicle: 'treasuries', stockReturn: 4.5 },
      TEST_TRIALS,
    )
    const stockSpread = stocks.data[29].renterP90 - stocks.data[29].renterP10
    const treasurySpread = treasuries.data[29].renterP90 - treasuries.data[29].renterP10
    expect(treasurySpread).toBeLessThan(stockSpread)
  })

  describe('never sell (pass to heirs)', () => {
    // Large appreciation makes the removed tax large relative to trial-to-trial
    // random noise, so the median comparison below is robust, not flaky.
    const highAppreciationInputs = { ...baseInputs, homeAppreciation: 8 }

    it('raises median buyer and renter year-30 net worth by removing sale/capital-gains tax', () => {
      const off = runMonteCarlo({ ...highAppreciationInputs, neverSell: false }, TEST_TRIALS)
      const on = runMonteCarlo({ ...highAppreciationInputs, neverSell: true }, TEST_TRIALS)
      expect(on.data[29].buyerMedian).toBeGreaterThan(off.data[29].buyerMedian)
      expect(on.data[29].renterMedian).toBeGreaterThan(off.data[29].renterMedian)
    })
  })
})

function pearsonCorrelation(xs, ys) {
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let cov = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  return cov / Math.sqrt(varX * varY)
}

describe('simulateTrial (correlated sampling)', () => {
  it('correlates buyer and renter year-30 outcomes via matched-year sampling', () => {
    // Large N keeps the correlation estimate stable — independent sampling
    // would hover near 0 with sampling noise ~1/sqrt(N) ≈ 0.02 at N=2000, so
    // this is a loose regression guard against reverting to independent
    // draws, not an assertion of a specific correlation magnitude.
    const N = 2000
    const buyerFinal = []
    const renterFinal = []
    for (let i = 0; i < N; i++) {
      const trial = simulateTrial(baseInputs)
      const final = trial[trial.length - 1]
      buyerFinal.push(final.buyerNetWorth)
      renterFinal.push(final.renterNetWorth)
    }
    expect(pearsonCorrelation(buyerFinal, renterFinal)).toBeGreaterThan(0.1)
  })
})

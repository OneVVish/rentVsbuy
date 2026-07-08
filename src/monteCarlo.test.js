import { describe, expect, it } from 'vitest'
import { runMonteCarlo } from './monteCarlo.js'

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
})

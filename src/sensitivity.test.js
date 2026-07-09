import { describe, expect, it } from 'vitest'
import { SENSITIVITY_INPUTS, runSensitivityAnalysis } from './sensitivity.js'
import { runSimulation } from './simulation.js'

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
  homeAppreciation: 3.5,
  rentInflation: 3,
  insuranceInflation: 4,
  maintenanceInflation: 3,
  capitalGainsTaxRate: 15,
  marriedFilingJointly: true,
  landValue: 130000,
  landlordOccupancyRate: 100,
  landlordManagementFeePct: 0,
}

describe('runSensitivityAnalysis', () => {
  it('matches a direct runSimulation call for the baseline advantage', () => {
    const { data } = runSimulation(baseInputs)
    const last = data[data.length - 1]
    const expectedBaseline = last.buyerNetWorth - last.renterNetWorth

    const { baselineAdvantage } = runSensitivityAnalysis(baseInputs)
    expect(baselineAdvantage).toBe(expectedBaseline)
  })

  it('returns one row per configured input', () => {
    const { rows } = runSensitivityAnalysis(baseInputs)
    expect(rows).toHaveLength(SENSITIVITY_INPUTS.length)
  })

  it('sorts rows by descending low-to-high swing', () => {
    const { rows } = runSensitivityAnalysis(baseInputs)
    const swings = rows.map((r) => Math.abs(r.highAdvantage - r.lowAdvantage))
    for (let i = 1; i < swings.length; i++) {
      expect(swings[i]).toBeLessThanOrEqual(swings[i - 1])
    }
  })

  it('clamps the low/high test values within each input\'s configured bounds', () => {
    const nearMaxDownPayment = { ...baseInputs, downPaymentPct: 95 }
    const { rows } = runSensitivityAnalysis(nearMaxDownPayment)
    const downPaymentRow = rows.find((r) => r.key === 'downPaymentPct')
    expect(downPaymentRow.highValue).toBeLessThanOrEqual(100)

    const nearMinRate = { ...baseInputs, mortgageRate: 0.5 }
    const { rows: rows2 } = runSensitivityAnalysis(nearMinRate)
    const rateRow = rows2.find((r) => r.key === 'mortgageRate')
    expect(rateRow.lowValue).toBeGreaterThanOrEqual(0)
  })

  it('uses a relative delta for Home Price', () => {
    const { rows } = runSensitivityAnalysis(baseInputs)
    const homePriceRow = rows.find((r) => r.key === 'homePrice')
    expect(homePriceRow.lowValue).toBeCloseTo(baseInputs.homePrice * 0.9, 5)
    expect(homePriceRow.highValue).toBeCloseTo(baseInputs.homePrice * 1.1, 5)
  })
})

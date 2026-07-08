import { describe, expect, it } from 'vitest'
import { calculateMortgagePayment, runSimulation } from './simulation.js'

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
}

describe('calculateMortgagePayment', () => {
  it('matches the standard amortization formula', () => {
    // $300,000 loan, 6% annual, 360 months — a widely-published reference value.
    const payment = calculateMortgagePayment(300000, 6, 360)
    expect(payment).toBeCloseTo(1798.65, 1)
  })

  it('falls back to a flat division when the rate is zero', () => {
    expect(calculateMortgagePayment(360000, 0, 360)).toBe(1000)
  })
})

describe('runSimulation', () => {
  it('returns 30 yearly data points', () => {
    const { data } = runSimulation(baseInputs)
    expect(data).toHaveLength(30)
    expect(data.map((d) => d.year)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })

  it('computes the down payment and initial cost basis from home price', () => {
    const { downPayment } = runSimulation(baseInputs)
    expect(downPayment).toBeCloseTo(130000, 5)
  })

  it('finds a break-even year when buying eventually overtakes renting', () => {
    const { breakEvenYear, data } = runSimulation(baseInputs)
    expect(breakEvenYear).not.toBeNull()
    const yearData = data.find((d) => d.year === breakEvenYear)
    expect(yearData.buyerNetWorth).toBeGreaterThan(yearData.renterNetWorth)
    // Every year before break-even should still favor renting.
    for (const d of data.filter((d) => d.year < breakEvenYear)) {
      expect(d.buyerNetWorth).toBeLessThanOrEqual(yearData.buyerNetWorth)
    }
  })

  it('reports no break-even year when renting always wins', () => {
    const { breakEvenYear } = runSimulation({
      ...baseInputs,
      stockReturn: 20,
      homeAppreciation: 0,
    })
    expect(breakEvenYear).toBeNull()
  })

  describe('California Prop 13 tax cap', () => {
    it('slows assessed-value growth relative to market appreciation when enabled', () => {
      const capped = runSimulation({ ...baseInputs, applyProp13Cap: true, homeAppreciation: 10 })
      const uncapped = runSimulation({ ...baseInputs, applyProp13Cap: false, homeAppreciation: 10 })
      // Market home value is identical either way...
      expect(capped.data[29].homeValue).toBe(uncapped.data[29].homeValue)
      // ...but the capped scenario collects less property tax, leaving the renter
      // with a smaller monthly surplus to invest, so they end up with less money.
      expect(capped.data[29].renterNetWorth).toBeLessThan(uncapped.data[29].renterNetWorth)
    })
  })

  describe('itemized mortgage/property tax deduction', () => {
    it('leaves buyer net worth unchanged but reduces the renter surplus', () => {
      const on = runSimulation({ ...baseInputs, applyItemizedDeduction: true })
      const off = runSimulation({ ...baseInputs, applyItemizedDeduction: false })
      expect(on.data[29].buyerNetWorth).toBe(off.data[29].buyerNetWorth)
      expect(on.data[29].renterNetWorth).toBeLessThan(off.data[29].renterNetWorth)
    })

    it('gives no benefit in year 1 (no prior year to base the credit on)', () => {
      const on = runSimulation({ ...baseInputs, applyItemizedDeduction: true })
      const off = runSimulation({ ...baseInputs, applyItemizedDeduction: false })
      expect(on.data[0].renterNetWorth).toBe(off.data[0].renterNetWorth)
    })
  })

  describe('home-sale capital gains exclusion', () => {
    it('nets more for a married filer than a single filer on the same sale', () => {
      const married = runSimulation({ ...baseInputs, marriedFilingJointly: true })
      const single = runSimulation({ ...baseInputs, marriedFilingJointly: false })
      expect(married.data[29].buyerNetWorth).toBeGreaterThan(single.data[29].buyerNetWorth)
    })
  })

  describe('state tax rate', () => {
    it('stacks on top of federal rates, reducing both buyer and renter outcomes', () => {
      const noState = runSimulation({ ...baseInputs, stateTaxRate: 0 })
      const withState = runSimulation({ ...baseInputs, stateTaxRate: 9.3 })
      expect(withState.data[29].buyerNetWorth).toBeLessThan(noState.data[29].buyerNetWorth)
      expect(withState.data[29].renterNetWorth).toBeLessThan(noState.data[29].renterNetWorth)
    })
  })

  describe('selling costs', () => {
    it('reduces buyer net worth as the selling cost percentage rises', () => {
      const low = runSimulation({ ...baseInputs, sellingCostPct: 2 })
      const high = runSimulation({ ...baseInputs, sellingCostPct: 10 })
      expect(high.data[29].buyerNetWorth).toBeLessThan(low.data[29].buyerNetWorth)
    })
  })
})

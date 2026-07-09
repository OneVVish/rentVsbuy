import { describe, expect, it } from 'vitest'
import {
  DEPRECIATION_RECAPTURE_FEDERAL_RATE,
  HOME_SALE_EXCLUSION_MFJ,
  calculateMortgagePayment,
  runSimulation,
} from './simulation.js'

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
  landValue: 130000, // 20% of homePrice — the building (depreciable basis) is the other 80%
  landlordOccupancyRate: 100,
  landlordManagementFeePct: 0,
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

  describe('landlord (buy & rent out) scenario', () => {
    it('returns a numeric landlordNetWorth for every year', () => {
      const { data } = runSimulation(baseInputs)
      expect(data).toHaveLength(30)
      expect(data.every((d) => typeof d.landlordNetWorth === 'number' && Number.isFinite(d.landlordNetWorth))).toBe(
        true,
      )
    })

    it('caps depreciation recapture at the full depreciable basis and partitions the sale gain exactly', () => {
      const inputs = { ...baseInputs, homeAppreciation: 8 }
      const { data } = runSimulation(inputs)
      const finalYear = data[29]
      const amountRealized = finalYear.homeValue * (1 - inputs.sellingCostPct / 100)
      const maxDepreciation = inputs.homePrice - inputs.landValue
      // 27.5-year depreciation period is shorter than the 30-year hold, so by year
      // 30 the full depreciable basis has already been used up.
      const adjustedCostBasis = inputs.homePrice - maxDepreciation
      const totalGain = amountRealized - adjustedCostBasis
      expect(totalGain).toBeGreaterThan(maxDepreciation) // sanity: gain big enough to exceed depreciation
      const depreciationRecapture = Math.min(Math.max(0, totalGain), maxDepreciation)
      const remainingGain = Math.max(0, totalGain - maxDepreciation)
      expect(depreciationRecapture).toBe(maxDepreciation)
      expect(depreciationRecapture + remainingGain).toBeCloseTo(totalGain, 6)
    })

    it('taxes gains harder than the buyer path since there is no Section 121 exclusion', () => {
      const inputs = { ...baseInputs, homeAppreciation: 8 }
      const { data } = runSimulation(inputs)
      const finalYear = data[29]
      const amountRealized = finalYear.homeValue * (1 - inputs.sellingCostPct / 100)
      const maxDepreciation = inputs.homePrice - inputs.landValue
      const totalGain = amountRealized - (inputs.homePrice - maxDepreciation)
      const depreciationRecapture = Math.min(Math.max(0, totalGain), maxDepreciation)
      const remainingGain = Math.max(0, totalGain - maxDepreciation)
      const effectiveCapitalGainsRate = inputs.capitalGainsTaxRate + inputs.stateTaxRate
      const landlordHomeSaleTax =
        depreciationRecapture * ((DEPRECIATION_RECAPTURE_FEDERAL_RATE + inputs.stateTaxRate) / 100) +
        remainingGain * (effectiveCapitalGainsRate / 100)

      const buyerHomeGain = Math.max(0, amountRealized - inputs.homePrice)
      const buyerTaxableGain = Math.max(0, buyerHomeGain - HOME_SALE_EXCLUSION_MFJ)
      const buyerHomeSaleTax = buyerTaxableGain * (effectiveCapitalGainsRate / 100)

      expect(landlordHomeSaleTax).toBeGreaterThan(buyerHomeSaleTax)
    })

    it('degrades sensibly with no rental income (edge case)', () => {
      const base = runSimulation(baseInputs)
      const noRent = runSimulation({ ...baseInputs, monthlyRent: 0 })
      const finalNoRent = noRent.data[29].landlordNetWorth
      expect(Number.isFinite(finalNoRent)).toBe(true)
      expect(finalNoRent).toBeLessThan(base.data[29].landlordNetWorth)
    })

    it('degrades sensibly with a 100% down payment (edge case)', () => {
      const { data } = runSimulation({ ...baseInputs, downPaymentPct: 100 })
      expect(Number.isFinite(data[29].landlordNetWorth)).toBe(true)
    })

    it('does not change buyer or renter net worth (regression guard)', () => {
      const { data } = runSimulation(baseInputs)
      expect(data[0].buyerNetWorth).toBe(90312)
      expect(data[0].renterNetWorth).toBe(157564)
      expect(data[14].buyerNetWorth).toBe(601193)
      expect(data[14].renterNetWorth).toBe(596809)
      expect(data[29].buyerNetWorth).toBe(1520423)
      expect(data[29].renterNetWorth).toBe(1550453)
    })

    describe('cash flow and equity/investment breakdown', () => {
      it('partitions net worth into property equity + invested surplus (within $1 rounding)', () => {
        const { data } = runSimulation(baseInputs)
        for (const d of data) {
          expect(Math.abs(d.landlordPropertyEquity + d.landlordInvestedSurplus - d.landlordNetWorth)).toBeLessThanOrEqual(
            1,
          )
        }
      })

      it('does not change landlordNetWorth itself (regression guard on the decomposition refactor)', () => {
        const { data } = runSimulation(baseInputs)
        expect(data[0].landlordNetWorth).toBe(227201)
        expect(data[14].landlordNetWorth).toBe(727187)
        expect(data[29].landlordNetWorth).toBe(2023345)
      })

      it('reports negative cash flow in year 1 and improves as rent inflates', () => {
        const { data } = runSimulation(baseInputs)
        expect(data[0].landlordCashFlow).toBeLessThan(0)
        expect(data[29].landlordCashFlow).toBeGreaterThan(data[0].landlordCashFlow)
      })
    })

    describe('occupancy rate', () => {
      // A rent high enough to produce positive cash flow, so vacancy differences
      // are actually visible (baseInputs' rent is too low relative to costs for
      // any occupancy level to ever cross into positive cash flow).
      const highRentInputs = { ...baseInputs, monthlyRent: 6000 }

      it('reduces landlord net worth monotonically as occupancy drops', () => {
        const full = runSimulation({ ...highRentInputs, landlordOccupancyRate: 100 })
        const partial = runSimulation({ ...highRentInputs, landlordOccupancyRate: 70 })
        const vacant = runSimulation({ ...highRentInputs, landlordOccupancyRate: 0 })
        expect(partial.data[29].landlordNetWorth).toBeLessThan(full.data[29].landlordNetWorth)
        expect(vacant.data[29].landlordNetWorth).toBeLessThan(partial.data[29].landlordNetWorth)
      })

      it('does not affect the shared buyer/renter figures', () => {
        const full = runSimulation({ ...highRentInputs, landlordOccupancyRate: 100 })
        const vacant = runSimulation({ ...highRentInputs, landlordOccupancyRate: 0 })
        expect(vacant.data[29].buyerNetWorth).toBe(full.data[29].buyerNetWorth)
        expect(vacant.data[29].renterNetWorth).toBe(full.data[29].renterNetWorth)
      })

      it('handles full vacancy without NaN/crash', () => {
        const { data } = runSimulation({ ...baseInputs, landlordOccupancyRate: 0 })
        expect(Number.isFinite(data[29].landlordNetWorth)).toBe(true)
      })
    })

    describe('annual management fee', () => {
      const highRentInputs = { ...baseInputs, monthlyRent: 6000 }

      it('reduces landlord net worth monotonically as the fee rises', () => {
        const none = runSimulation({ ...highRentInputs, landlordManagementFeePct: 0 })
        const some = runSimulation({ ...highRentInputs, landlordManagementFeePct: 8 })
        const all = runSimulation({ ...highRentInputs, landlordManagementFeePct: 100 })
        expect(some.data[29].landlordNetWorth).toBeLessThan(none.data[29].landlordNetWorth)
        expect(all.data[29].landlordNetWorth).toBeLessThan(some.data[29].landlordNetWorth)
      })

      it('handles a 100% fee (all rent consumed) without NaN/crash', () => {
        const { data } = runSimulation({ ...highRentInputs, landlordManagementFeePct: 100 })
        expect(Number.isFinite(data[29].landlordNetWorth)).toBe(true)
      })
    })

    describe('land value', () => {
      it('reduces the depreciation tax shield as land value rises (less building to depreciate)', () => {
        const highRentInputs = { ...baseInputs, monthlyRent: 6000 }
        const mostlyBuilding = runSimulation({ ...highRentInputs, landValue: 0 })
        const balanced = runSimulation({ ...highRentInputs, landValue: 130000 })
        const allLand = runSimulation({ ...highRentInputs, landValue: highRentInputs.homePrice })
        expect(balanced.data[29].landlordNetWorth).toBeLessThan(mostlyBuilding.data[29].landlordNetWorth)
        expect(allLand.data[29].landlordNetWorth).toBeLessThan(balanced.data[29].landlordNetWorth)
      })

      it('clamps depreciable basis at zero if land value exceeds home price (edge case)', () => {
        const { data } = runSimulation({ ...baseInputs, landValue: baseInputs.homePrice * 2 })
        expect(Number.isFinite(data[29].landlordNetWorth)).toBe(true)
      })
    })
  })
})

export const YEARS = 30
export const MONTHS = YEARS * 12

// California Prop 13 caps annual growth of a property's *assessed* value (the
// property-tax base) at 2%, even when market value appreciates faster.
export const PROP13_ANNUAL_CAP = 2

// Approximate figures under current federal tax law (mortgage acquisition debt
// cap, SALT cap, standard deduction, and Section 121 home-sale exclusion) —
// adjust if your tax year/situation differs.
export const MORTGAGE_INTEREST_DEBT_CAP = 750000
export const SALT_DEDUCTION_CAP = 10000
export const STANDARD_DEDUCTION_SINGLE = 15000
export const STANDARD_DEDUCTION_MFJ = 30000
export const HOME_SALE_EXCLUSION_SINGLE = 250000
export const HOME_SALE_EXCLUSION_MFJ = 500000

// Monthly amortized payment for a fixed-rate loan.
export function calculateMortgagePayment(loanAmount, annualRate, termMonths) {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return loanAmount / termMonths
  const factor = Math.pow(1 + monthlyRate, termMonths)
  return (loanAmount * monthlyRate * factor) / (factor - 1)
}

export function runSimulation(inputs) {
  const {
    homePrice,
    monthlyRent,
    downPaymentPct,
    mortgageRate,
    propertyTaxRate,
    monthlyHOA,
    homeInsuranceAnnual,
    yearlyMaintenance,
    applyProp13Cap,
    sellingCostPct,
    applyItemizedDeduction,
    marginalTaxRate,
    stateTaxRate,
    stockReturn,
    homeAppreciation,
    rentInflation,
    insuranceInflation,
    maintenanceInflation,
    capitalGainsTaxRate,
    marriedFilingJointly,
  } = inputs

  const downPayment = homePrice * (downPaymentPct / 100)
  const loanAmount = homePrice - downPayment
  const monthlyMortgageRate = mortgageRate / 100 / 12
  const mortgagePayment = calculateMortgagePayment(loanAmount, mortgageRate, MONTHS)
  const monthlyStockReturn = Math.pow(1 + stockReturn / 100, 1 / 12) - 1
  const assessedValueGrowthRate = applyProp13Cap
    ? Math.min(homeAppreciation, PROP13_ANNUAL_CAP)
    : homeAppreciation
  const deductibleInterestRatio = Math.min(1, MORTGAGE_INTEREST_DEBT_CAP / loanAmount)
  const standardDeduction = marriedFilingJointly ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE
  const homeSaleExclusion = marriedFilingJointly ? HOME_SALE_EXCLUSION_MFJ : HOME_SALE_EXCLUSION_SINGLE
  // California (and most states) don't offer a preferential capital gains rate — gains
  // are taxed as ordinary state income, so state tax stacks on top of the federal rate.
  const effectiveMarginalRate = marginalTaxRate + stateTaxRate
  const effectiveCapitalGainsRate = capitalGainsTaxRate + stateTaxRate

  let homeValue = homePrice
  let assessedValue = homePrice
  let rent = monthlyRent
  let homeInsurance = homeInsuranceAnnual
  let maintenance = yearlyMaintenance
  let loanBalance = loanAmount
  let portfolio = downPayment
  let costBasis = downPayment
  let yearInterestPaid = 0
  let yearPropertyTaxPaid = 0
  let monthlyItemizedSavings = 0

  const data = []

  for (let month = 1; month <= MONTHS; month++) {
    // Appreciate home/assessed value and inflate rent/insurance/maintenance once a year.
    if (month > 1 && (month - 1) % 12 === 0) {
      // Roll last year's actual mortgage interest + property tax into this year's
      // monthly tax-savings credit (a one-year lag, same as how a real refund works).
      if (applyItemizedDeduction) {
        const deductibleInterest = yearInterestPaid * deductibleInterestRatio
        const saltDeductible = Math.min(yearPropertyTaxPaid, SALT_DEDUCTION_CAP)
        const itemizedTaxSavings =
          Math.max(0, deductibleInterest + saltDeductible - standardDeduction) *
          (effectiveMarginalRate / 100)
        monthlyItemizedSavings = itemizedTaxSavings / 12
      }
      yearInterestPaid = 0
      yearPropertyTaxPaid = 0

      homeValue *= 1 + homeAppreciation / 100
      assessedValue *= 1 + assessedValueGrowthRate / 100
      rent *= 1 + rentInflation / 100
      homeInsurance *= 1 + insuranceInflation / 100
      maintenance *= 1 + maintenanceInflation / 100
    }

    const interestPayment = loanBalance * monthlyMortgageRate
    const principalPayment = mortgagePayment - interestPayment
    loanBalance = Math.max(0, loanBalance - principalPayment)
    yearInterestPaid += interestPayment

    const monthlyPropertyTax = (assessedValue * (propertyTaxRate / 100)) / 12
    yearPropertyTaxPaid += monthlyPropertyTax
    const monthlyInsurance = homeInsurance / 12
    const monthlyMaintenance = maintenance / 12
    const totalMonthlyHomeCost =
      mortgagePayment +
      monthlyPropertyTax +
      monthlyHOA +
      monthlyInsurance +
      monthlyMaintenance -
      monthlyItemizedSavings

    portfolio *= 1 + monthlyStockReturn
    const monthlySavings = totalMonthlyHomeCost - rent
    if (monthlySavings > 0) {
      portfolio += monthlySavings
      costBasis += monthlySavings
    }

    if (month % 12 === 0) {
      const year = month / 12
      const amountRealized = homeValue * (1 - sellingCostPct / 100)
      const homeGain = Math.max(0, amountRealized - homePrice)
      const taxableHomeGain = Math.max(0, homeGain - homeSaleExclusion)
      const homeSaleTax = taxableHomeGain * (effectiveCapitalGainsRate / 100)
      const netSaleProceeds = amountRealized - loanBalance - homeSaleTax
      const capitalGainsTax = (effectiveCapitalGainsRate / 100) * Math.max(0, portfolio - costBasis)
      data.push({
        year,
        buyerNetWorth: Math.round(netSaleProceeds),
        renterNetWorth: Math.round(portfolio - capitalGainsTax),
        homeValue: Math.round(homeValue),
        monthlyRent: Math.round(rent),
      })
    }
  }

  const breakEvenPoint = data.find((d) => d.buyerNetWorth > d.renterNetWorth)

  return {
    data,
    mortgagePayment,
    downPayment,
    breakEvenYear: breakEvenPoint ? breakEvenPoint.year : null,
  }
}

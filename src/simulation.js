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

// Standard US residential rental depreciation: buildings depreciate straight-line
// over 27.5 years (IRS Pub. 527). Land itself never depreciates — the user-provided
// Land Value input is subtracted from the purchase price to get the depreciable
// (building-only) basis.
export const DEPRECIATION_PERIOD_YEARS = 27.5
// Federal unrecaptured Section 1250 gain (depreciation recapture) rate on sale of
// rental real estate — a flat rate distinct from ordinary capital-gains rates.
export const DEPRECIATION_RECAPTURE_FEDERAL_RATE = 25

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
    landValue,
    landlordOccupancyRate,
    landlordManagementFeePct,
    neverSell,
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
  // Land never depreciates — only the building (purchase price minus land value) does.
  const depreciableBasis = Math.max(0, homePrice - landValue)
  const annualDepreciation = depreciableBasis / DEPRECIATION_PERIOD_YEARS
  const maxDepreciation = depreciableBasis
  const occupancyFactor = landlordOccupancyRate / 100

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

  // "Buy & Rent Out": the same property and mortgage as the buyer above, but rented
  // to a tenant instead of lived in. Modeled on Schedule E (rental income/expense),
  // not the buyer's Schedule A itemized deduction above — different tax treatment,
  // computed in parallel from the same shared homeValue/loanBalance trajectory.
  //
  // Starts at 0, NOT downPayment — unlike the renter, the landlord DOES buy the
  // house, so their down payment is already spent and already reflected in
  // landlordPropertyEquity below. Seeding this at downPayment too would double-
  // count it as a second, imaginary pot of cash the landlord doesn't actually have.
  let landlordPortfolio = 0
  let landlordCostBasis = 0
  let accumulatedDepreciation = 0
  let monthlyLandlordTaxEffect = 0
  let yearRentalIncome = 0
  let yearOwnerCosts = 0
  let yearManagementFeePaid = 0
  let yearLandlordCashFlow = 0
  let yearRenterCashFlow = 0

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

      // Schedule-E-style net taxable rental income for the year just completed,
      // rolled into this year's monthly tax-effect credit — same one-year lag as
      // the buyer's itemized-deduction credit above. Can be negative (a paper
      // loss, common with depreciation); simplified to reduce the landlord's tax
      // bill dollar-for-dollar rather than modeling real passive-activity-loss
      // limits (IRC §469). yearRentalIncome already reflects the occupancy rate
      // (vacant months collect no rent), and the management fee is its own
      // deductible line item below.
      //
      // Deliberately uses the FULL yearInterestPaid and yearPropertyTaxPaid, NOT
      // the buyer's deductibleInterestRatio ($750K debt cap) or SALT_DEDUCTION_CAP
      // ($10K) above — those caps are specific to the itemized (Schedule A)
      // deduction on a primary residence. A rental property deducts mortgage
      // interest and property tax in full as ordinary business expenses.
      const netTaxableRentalIncome =
        yearRentalIncome -
        yearInterestPaid -
        yearPropertyTaxPaid -
        yearOwnerCosts -
        yearManagementFeePaid -
        annualDepreciation
      monthlyLandlordTaxEffect = (netTaxableRentalIncome * (effectiveMarginalRate / 100)) / 12
      yearRentalIncome = 0
      yearOwnerCosts = 0
      yearManagementFeePaid = 0

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
    accumulatedDepreciation = Math.min(accumulatedDepreciation + annualDepreciation / 12, maxDepreciation)

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
    // Tracks the renter's actual monthly delta whether positive or negative, for
    // the Cash Flow chart — mirrors yearLandlordCashFlow below.
    yearRenterCashFlow += monthlySavings
    // Applied unconditionally — if renting costs more than buying that month, the
    // shortfall is assumed to come out of the same invested pot (at the same
    // opportunity-cost rate as a contribution would have earned), not from some
    // untracked outside source. Cost basis only grows on a real contribution;
    // withdrawals don't reduce it (no realized-loss accounting on withdrawal).
    portfolio += monthlySavings
    if (monthlySavings > 0) {
      costBasis += monthlySavings
    }

    // Vacancy reduces rental income received, but not carrying costs (mortgage,
    // tax, HOA, insurance, maintenance keep accruing whether or not a tenant is
    // in place). The management fee is charged on collected (post-vacancy) rent,
    // the standard convention, and is itself a deductible operating expense.
    const collectedRent = rent * occupancyFactor
    const managementFee = collectedRent * (landlordManagementFeePct / 100)
    yearRentalIncome += collectedRent
    yearManagementFeePaid += managementFee

    const monthlyOwnerCosts = monthlyHOA + monthlyInsurance + monthlyMaintenance
    yearOwnerCosts += monthlyOwnerCosts

    const totalMonthlyOwnerCosts = mortgagePayment + monthlyPropertyTax + monthlyOwnerCosts + managementFee
    landlordPortfolio *= 1 + monthlyStockReturn
    const landlordMonthlySavings = collectedRent - totalMonthlyOwnerCosts - monthlyLandlordTaxEffect
    // Tracks the landlord's actual cash flow whether positive or negative, for
    // the Cash Flow chart.
    yearLandlordCashFlow += landlordMonthlySavings
    // Applied unconditionally, same reasoning as the renter's portfolio above —
    // a cash-flow shortfall draws down the invested surplus (at the same
    // opportunity-cost rate) rather than vanishing into an untracked outside
    // source. Cost basis only grows on a real contribution.
    landlordPortfolio += landlordMonthlySavings
    if (landlordMonthlySavings > 0) {
      landlordCostBasis += landlordMonthlySavings
    }

    if (month % 12 === 0) {
      const year = month / 12
      // "Never Sell": no actual sale happens (the asset is held until death and
      // inherited), so there are no selling costs, and under current step-up-in-
      // basis rules (IRC §1014) no capital gains tax or depreciation recapture on
      // lifetime appreciation. Applied symmetrically to the buyer's home, the
      // renter's portfolio, and (below) the landlord's property + portfolio, so
      // the comparison stays fair rather than one-sidedly favoring buying.
      const amountRealized = neverSell ? homeValue : homeValue * (1 - sellingCostPct / 100)
      const homeGain = Math.max(0, amountRealized - homePrice)
      const taxableHomeGain = Math.max(0, homeGain - homeSaleExclusion)
      const homeSaleTax = neverSell ? 0 : taxableHomeGain * (effectiveCapitalGainsRate / 100)
      const netSaleProceeds = amountRealized - loanBalance - homeSaleTax
      const capitalGainsTax = neverSell
        ? 0
        : (effectiveCapitalGainsRate / 100) * Math.max(0, portfolio - costBasis)

      // No Section 121 exclusion — this is a rental/investment property, not a
      // primary residence. Depreciation reduces the cost basis (standard tax
      // rule); the recaptured portion of the gain is taxed at the flat federal
      // recapture rate + state, any remaining gain at the normal capital-gains rate.
      const adjustedCostBasis = homePrice - accumulatedDepreciation
      const totalGain = amountRealized - adjustedCostBasis
      const depreciationRecapture = Math.min(Math.max(0, totalGain), accumulatedDepreciation)
      const remainingGain = Math.max(0, totalGain - accumulatedDepreciation)
      const landlordHomeSaleTax = neverSell
        ? 0
        : depreciationRecapture * ((DEPRECIATION_RECAPTURE_FEDERAL_RATE + stateTaxRate) / 100) +
          remainingGain * (effectiveCapitalGainsRate / 100)
      const landlordCapitalGainsTax = neverSell
        ? 0
        : (effectiveCapitalGainsRate / 100) * Math.max(0, landlordPortfolio - landlordCostBasis)
      // Net worth splits cleanly into two pieces with very different liquidity/tax
      // characteristics: the property itself (illiquid, tax-deferred until sale)
      // and reinvested cash-flow surplus (liquid, taxed annually on realized gains).
      const landlordPropertyEquity = amountRealized - loanBalance - landlordHomeSaleTax
      const landlordInvestedSurplus = landlordPortfolio - landlordCapitalGainsTax
      const landlordNetWorth = landlordPropertyEquity + landlordInvestedSurplus

      data.push({
        year,
        buyerNetWorth: Math.round(netSaleProceeds),
        renterNetWorth: Math.round(portfolio - capitalGainsTax),
        renterCashFlow: Math.round(yearRenterCashFlow),
        landlordNetWorth: Math.round(landlordNetWorth),
        landlordCashFlow: Math.round(yearLandlordCashFlow),
        landlordPropertyEquity: Math.round(landlordPropertyEquity),
        landlordInvestedSurplus: Math.round(landlordInvestedSurplus),
        homeValue: Math.round(homeValue),
        monthlyRent: Math.round(rent),
      })
      yearLandlordCashFlow = 0
      yearRenterCashFlow = 0
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

import {
  MONTHS,
  YEARS,
  PROP13_ANNUAL_CAP,
  MORTGAGE_INTEREST_DEBT_CAP,
  SALT_DEDUCTION_CAP,
  STANDARD_DEDUCTION_SINGLE,
  STANDARD_DEDUCTION_MFJ,
  HOME_SALE_EXCLUSION_SINGLE,
  HOME_SALE_EXCLUSION_MFJ,
  calculateMortgagePayment,
} from './simulation.js'
import {
  CORRELATED_HISTORICAL_YEARS,
  CORRELATED_STOCKS_MEAN,
  CORRELATED_TREASURY_MEAN,
  CORRELATED_GOLD_MEAN,
} from './data/correlatedHistoricalYears.js'
import { HOME_PRICE_MEAN_CHANGE } from './data/homePriceHistoricalAppreciation.js'

export const MC_TRIALS = 500

const VEHICLE_MEANS = {
  stocks: CORRELATED_STOCKS_MEAN,
  treasuries: CORRELATED_TREASURY_MEAN,
  gold: CORRELATED_GOLD_MEAN,
}

function recenter(historicalValue, seriesMean, targetMean) {
  return targetMean + (historicalValue - seriesMean)
}

// Draws ONE historical calendar year (1987-2025) shared by both the
// investment return and home appreciation samples for a simulated year, so
// the pairing reflects real historical co-movement (e.g. 2008's stock crash
// and 2008's housing downturn land together) instead of two independently
// shuffled draws.
function sampleCorrelatedYear() {
  return CORRELATED_HISTORICAL_YEARS[Math.floor(Math.random() * CORRELATED_HISTORICAL_YEARS.length)]
}

// Re-centers that year's return for the renter's chosen investment vehicle
// so the sampled distribution's mean matches the user's assumed rate — this
// keeps the actual historical variance/skew/fat-tails while still respecting
// the slider.
function sampleVehicleReturn(yearEntry, targetMean, investmentVehicle) {
  const vehicle = investmentVehicle in VEHICLE_MEANS ? investmentVehicle : 'stocks'
  return recenter(yearEntry[vehicle], VEHICLE_MEANS[vehicle], targetMean)
}

// Same re-centering approach, using that same year's real home-price change.
function sampleHomeAppreciation(yearEntry, targetMean) {
  return recenter(yearEntry.homePrice, HOME_PRICE_MEAN_CHANGE, targetMean)
}

function percentile(sortedArr, p) {
  const idx = (p / 100) * (sortedArr.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sortedArr[lower]
  const weight = idx - lower
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight
}

export function simulateTrial(inputs) {
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
    investmentVehicle,
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
  const deductibleInterestRatio = Math.min(1, MORTGAGE_INTEREST_DEBT_CAP / loanAmount)
  const standardDeduction = marriedFilingJointly ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE
  const homeSaleExclusion = marriedFilingJointly ? HOME_SALE_EXCLUSION_MFJ : HOME_SALE_EXCLUSION_SINGLE
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
  let correlatedYear = sampleCorrelatedYear()
  let monthlyStockReturn =
    Math.pow(1 + sampleVehicleReturn(correlatedYear, stockReturn, investmentVehicle) / 100, 1 / 12) - 1

  const yearly = []

  for (let month = 1; month <= MONTHS; month++) {
    if (month > 1 && (month - 1) % 12 === 0) {
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

      correlatedYear = sampleCorrelatedYear()
      const sampledAppreciation = sampleHomeAppreciation(correlatedYear, homeAppreciation)
      homeValue *= 1 + sampledAppreciation / 100
      const assessedGrowth = applyProp13Cap
        ? Math.min(sampledAppreciation, PROP13_ANNUAL_CAP)
        : sampledAppreciation
      assessedValue *= 1 + assessedGrowth / 100
      rent *= 1 + rentInflation / 100
      homeInsurance *= 1 + insuranceInflation / 100
      maintenance *= 1 + maintenanceInflation / 100
      monthlyStockReturn =
        Math.pow(1 + sampleVehicleReturn(correlatedYear, stockReturn, investmentVehicle) / 100, 1 / 12) - 1
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
    // Applied unconditionally — see the matching comment in simulation.js. If
    // renting costs more than buying that month, the shortfall draws down the
    // invested portfolio rather than vanishing into an untracked outside source.
    portfolio += monthlySavings
    if (monthlySavings > 0) {
      costBasis += monthlySavings
    }

    if (month % 12 === 0) {
      const amountRealized = homeValue * (1 - sellingCostPct / 100)
      const homeGain = Math.max(0, amountRealized - homePrice)
      const taxableHomeGain = Math.max(0, homeGain - homeSaleExclusion)
      const homeSaleTax = taxableHomeGain * (effectiveCapitalGainsRate / 100)
      const netSaleProceeds = amountRealized - loanBalance - homeSaleTax
      const capitalGainsTax = (effectiveCapitalGainsRate / 100) * Math.max(0, portfolio - costBasis)
      yearly.push({
        buyerNetWorth: netSaleProceeds,
        renterNetWorth: portfolio - capitalGainsTax,
      })
    }
  }

  return yearly
}

export function runMonteCarlo(inputs, trials = MC_TRIALS) {
  const perYearBuyer = Array.from({ length: YEARS }, () => [])
  const perYearRenter = Array.from({ length: YEARS }, () => [])
  let buyerWins = 0

  for (let t = 0; t < trials; t++) {
    const trial = simulateTrial(inputs)
    trial.forEach((d, i) => {
      perYearBuyer[i].push(d.buyerNetWorth)
      perYearRenter[i].push(d.renterNetWorth)
    })
    const final = trial[trial.length - 1]
    if (final.buyerNetWorth > final.renterNetWorth) buyerWins++
  }

  const data = perYearBuyer.map((buyerVals, i) => {
    const renterVals = perYearRenter[i]
    const bSorted = [...buyerVals].sort((a, b) => a - b)
    const rSorted = [...renterVals].sort((a, b) => a - b)
    const buyerP10 = percentile(bSorted, 10)
    const buyerP90 = percentile(bSorted, 90)
    const renterP10 = percentile(rSorted, 10)
    const renterP90 = percentile(rSorted, 90)

    return {
      year: i + 1,
      buyerP10,
      buyerMedian: percentile(bSorted, 50),
      buyerP90,
      buyerLow: buyerP10,
      buyerRange: buyerP90 - buyerP10,
      renterP10,
      renterMedian: percentile(rSorted, 50),
      renterP90,
      renterLow: renterP10,
      renterRange: renterP90 - renterP10,
    }
  })

  return {
    data,
    trials,
    buyerWinProbability: buyerWins / trials,
  }
}

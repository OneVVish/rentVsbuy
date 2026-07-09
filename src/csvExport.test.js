import { describe, expect, it } from 'vitest'
import { buildCsv } from './csvExport.js'

const sampleData = [
  {
    year: 1,
    buyerNetWorth: 100000,
    renterNetWorth: 90000,
    renterCashFlow: -500,
    landlordNetWorth: 95000,
    landlordCashFlow: 200,
    landlordPropertyEquity: 80000,
    landlordInvestedSurplus: 15000,
    homeValue: 660000,
    monthlyRent: 2884,
  },
  {
    year: 2,
    buyerNetWorth: 120000,
    renterNetWorth: 95000,
    renterCashFlow: -450,
    landlordNetWorth: 98000,
    landlordCashFlow: 250,
    landlordPropertyEquity: 83000,
    landlordInvestedSurplus: 15000,
    homeValue: 683000,
    monthlyRent: 2971,
  },
]

describe('buildCsv', () => {
  it('emits a header row with human-readable column labels', () => {
    const csv = buildCsv(sampleData)
    const [header] = csv.split('\n')
    expect(header).toBe(
      'Year,Buyer Net Worth,Renter Net Worth,Renter Cash Flow,Buy & Rent Out Net Worth,' +
        'Buy & Rent Out Cash Flow,Buy & Rent Out Property Equity,Buy & Rent Out Invested Surplus,' +
        'Home Value,Monthly Rent',
    )
  })

  it('emits one data row per year, in order', () => {
    const csv = buildCsv(sampleData)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('1,100000,90000,-500,95000,200,80000,15000,660000,2884')
    expect(lines[2]).toBe('2,120000,95000,-450,98000,250,83000,15000,683000,2971')
  })

  it('returns just the header for an empty data array', () => {
    const csv = buildCsv([])
    expect(csv.split('\n')).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { parseZillowScreenshot } from './screenshotImport.js'

describe('parseZillowScreenshot', () => {
  it('extracts all four fields from a well-formed listing screenshot', () => {
    const sample = `
      123 Main St, San Francisco, CA 94110
      Zestimate®: $1,245,000
      Est. payment $6,832/mo
      Rent Zestimate®: $3,850/mo
      Property taxes $13,695
      HOA: $150/mo
    `
    expect(parseZillowScreenshot(sample)).toEqual({
      homePrice: 1245000,
      monthlyRent: 3850,
      propertyTaxRate: 1.1,
      monthlyHOA: 150,
    })
  })

  it('is not confused when "Rent Zestimate" appears before "Zestimate"', () => {
    const sample = `
      456 Oak Ave
      Rent Zestimate®: $2,900/mo
      Zestimate®: $875,000
    `
    const result = parseZillowScreenshot(sample)
    expect(result.homePrice).toBe(875000)
    expect(result.monthlyRent).toBe(2900)
  })

  it('returns nulls for every field when nothing matches', () => {
    expect(parseZillowScreenshot('No useful data here at all')).toEqual({
      homePrice: null,
      monthlyRent: null,
      propertyTaxRate: null,
      monthlyHOA: null,
    })
  })

  it('falls back to the first large dollar amount when there is no Zestimate label', () => {
    const result = parseZillowScreenshot('789 Elm St $650,000 3 bed 2 bath')
    expect(result.homePrice).toBe(650000)
    expect(result.monthlyRent).toBeNull()
  })
})

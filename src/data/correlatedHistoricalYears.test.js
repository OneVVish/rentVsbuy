import { describe, expect, it } from 'vitest'
import { CORRELATED_HISTORICAL_YEARS } from './correlatedHistoricalYears.js'
import { HOME_PRICE_ANNUAL_CHANGES } from './homePriceHistoricalAppreciation.js'
import { SP500_ANNUAL_RETURNS } from './sp500HistoricalReturns.js'
import { TREASURY_ANNUAL_RETURNS } from './treasuryHistoricalReturns.js'
import { GOLD_ANNUAL_RETURNS } from './goldHistoricalReturns.js'

describe('CORRELATED_HISTORICAL_YEARS', () => {
  it('has one entry per home-price year, correctly paired', () => {
    expect(CORRELATED_HISTORICAL_YEARS).toHaveLength(HOME_PRICE_ANNUAL_CHANGES.length)
    expect(CORRELATED_HISTORICAL_YEARS[0].year).toBe(1987)
    expect(CORRELATED_HISTORICAL_YEARS.at(-1).year).toBe(2025)
    CORRELATED_HISTORICAL_YEARS.forEach((entry, i) => {
      expect(entry.homePrice).toBe(HOME_PRICE_ANNUAL_CHANGES[i])
    })
  })

  it('pairs each year with that same calendar year from the longer series', () => {
    // The longer series (98/98/54 entries) end at the same year (2025) as the
    // home-price series (39 entries), so the last N entries of each should
    // line up index-for-index with CORRELATED_HISTORICAL_YEARS.
    const n = CORRELATED_HISTORICAL_YEARS.length
    const stocksTail = SP500_ANNUAL_RETURNS.slice(-n)
    const treasuriesTail = TREASURY_ANNUAL_RETURNS.slice(-n)
    const goldTail = GOLD_ANNUAL_RETURNS.slice(-n)
    CORRELATED_HISTORICAL_YEARS.forEach((entry, i) => {
      expect(entry.stocks).toBe(stocksTail[i])
      expect(entry.treasuries).toBe(treasuriesTail[i])
      expect(entry.gold).toBe(goldTail[i])
    })
  })
})

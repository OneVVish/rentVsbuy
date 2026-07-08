// Pairs each home-price year with the SAME calendar year's stock, Treasury,
// and gold performance, so Monte Carlo trials sample real historical
// co-movement (e.g. 2008's stock crash lands on 2008's housing downturn)
// instead of drawing housing and investment returns independently.
//
// Home price data (FRED Case-Shiller) only goes back to 1987, so this
// intentionally restricts stocks/Treasuries to their most recent 39 years
// (1987-2025) and gold to the overlapping tail of its 1972-2025 history.
// Pre-1987 stock/Treasury history and pre-1987 gold history remain
// available via the raw series exports, but are no longer used for Monte
// Carlo sampling — see monteCarlo.js. If the raw series are ever extended
// with new years, update all four files together so this stays aligned.
import { SP500_ANNUAL_RETURNS } from './sp500HistoricalReturns.js'
import { TREASURY_ANNUAL_RETURNS } from './treasuryHistoricalReturns.js'
import { GOLD_ANNUAL_RETURNS } from './goldHistoricalReturns.js'
import { HOME_PRICE_ANNUAL_CHANGES } from './homePriceHistoricalAppreciation.js'

const HOME_PRICE_START_YEAR = 1987
const WINDOW = HOME_PRICE_ANNUAL_CHANGES.length // 39

const stocksWindow = SP500_ANNUAL_RETURNS.slice(-WINDOW)
const treasuriesWindow = TREASURY_ANNUAL_RETURNS.slice(-WINDOW)
const goldWindow = GOLD_ANNUAL_RETURNS.slice(-WINDOW)

// One entry per calendar year, 1987-2025 — every field is that SAME year's
// real value, so sampling one entry gives correlated stock/home movement.
export const CORRELATED_HISTORICAL_YEARS = HOME_PRICE_ANNUAL_CHANGES.map((homeChange, i) => ({
  year: HOME_PRICE_START_YEAR + i,
  stocks: stocksWindow[i],
  treasuries: treasuriesWindow[i],
  gold: goldWindow[i],
  homePrice: homeChange,
}))

const mean = (arr) => arr.reduce((sum, v) => sum + v, 0) / arr.length

// Means over the SAME restricted window used for sampling (not the raw
// files' full-history means) — required so re-centering an investment
// vehicle's slider value stays unbiased against the population actually
// being sampled from.
export const CORRELATED_STOCKS_MEAN = mean(stocksWindow)
export const CORRELATED_TREASURY_MEAN = mean(treasuriesWindow)
export const CORRELATED_GOLD_MEAN = mean(goldWindow)

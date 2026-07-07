// Annual U.S. national home price appreciation (%, January-over-January change),
// derived from the S&P/Case-Shiller U.S. National Home Price Index (CSUSHPINSA),
// 1987-2025. Source: FRED (Federal Reserve Bank of St. Louis),
// https://fred.stlouisfed.org/series/CSUSHPINSA, pulled 2026-07 via
// https://fred.stlouisfed.org/graph/fredgraph.csv?id=CSUSHPINSA.
export const HOME_PRICE_ANNUAL_CHANGES = [
  7.61, 7.34, 3.95, -1.3, 0.23, 0.92, 2.36, 2.34, 1.75, 2.58, 4.35, 6.37, 7.86, 9.22, 6.61, 9.63,
  10.22, 13.81, 12.93, 1.04, -6.37, -12.69, -2.92, -4.12, -3.51, 7.56, 10.44, 4.31, 5.28, 5.5, 6.2,
  4.12, 4.01, 11.31, 19.25, 3.83, 6.17, 4.16, 0.94,
]

export const HOME_PRICE_MEAN_CHANGE =
  HOME_PRICE_ANNUAL_CHANGES.reduce((sum, r) => sum + r, 0) / HOME_PRICE_ANNUAL_CHANGES.length

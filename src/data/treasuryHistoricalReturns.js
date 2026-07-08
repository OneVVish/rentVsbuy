// Annual total returns (%, price + coupon) on 10-year U.S. Treasury bonds, 1928-2025.
// Source: Aswath Damodaran, NYU Stern — same "Returns by year" dataset used for
// the S&P 500 series (see sp500HistoricalReturns.js), pulled 2026-07.
export const TREASURY_ANNUAL_RETURNS = [
  0.84, 4.2, 4.54, -2.56, 8.79, 1.86, 7.96, 4.47, 5.02, 1.38, 4.21, 4.41, 5.4, -2.02, 2.29, 2.49,
  2.58, 3.8, 3.13, 0.92, 1.95, 4.66, 0.43, -0.3, 2.27, 4.14, 3.29, -1.34, -2.26, 6.8, -2.1, -2.65,
  11.64, 2.06, 5.69, 1.68, 3.73, 0.72, 2.91, -1.58, 3.27, -5.01, 16.75, 9.79, 2.82, 3.66, 1.99,
  3.61, 15.98, 1.29, -0.78, 0.67, -2.99, 8.2, 32.81, 3.2, 13.73, 25.71, 24.28, -4.96, 8.22, 17.69,
  6.24, 15.0, 9.36, 14.21, -8.04, 23.48, 1.43, 9.94, 14.92, -8.25, 16.66, 5.57, 15.12, 0.38, 4.49,
  2.87, 1.96, 10.21, 20.1, -11.12, 8.46, 16.04, 2.97, -9.1, 10.75, 1.28, 0.69, 2.8, -0.02, 9.64,
  11.33, -4.42, -17.83, 3.88, -1.64, 7.8,
]

export const TREASURY_MEAN_RETURN =
  TREASURY_ANNUAL_RETURNS.reduce((sum, r) => sum + r, 0) / TREASURY_ANNUAL_RETURNS.length

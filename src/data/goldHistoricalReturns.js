// Annual gold price % change, 1972-2025. Starts in 1972 (post-Bretton Woods)
// rather than 1928 because gold prices were fixed by the U.S. government under
// the gold standard until 1971 — pre-1972 "returns" reflect occasional official
// revaluations, not market pricing, and would understate real volatility.
// Source: Aswath Damodaran, NYU Stern — same dataset used for the S&P 500 and
// Treasury series, pulled 2026-07.
export const GOLD_ANNUAL_RETURNS = [
  48.78, 72.96, 66.15, -24.8, -4.1, 22.64, 37.01, 126.55, 15.19, -32.6, 15.62, -16.8, -19.38, 6.0,
  18.96, 24.53, -15.26, -2.84, -3.11, -8.56, -5.73, 17.68, -2.17, 0.98, -4.59, -21.41, -0.83, 0.85,
  -5.44, 0.75, 25.57, 19.89, 4.65, 17.77, 23.2, 31.92, 4.32, 25.04, 29.24, 12.02, 5.68, -27.61,
  0.12, -12.11, 8.1, 12.66, -0.93, 19.08, 24.17, -3.75, 0.55, 13.26, 25.96, 66.22,
]

export const GOLD_MEAN_RETURN =
  GOLD_ANNUAL_RETURNS.reduce((sum, r) => sum + r, 0) / GOLD_ANNUAL_RETURNS.length

// Annual S&P 500 total returns (%, dividends reinvested), 1928-2025.
// Source: Aswath Damodaran, NYU Stern — "Returns by year" dataset
// (https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html),
// pulled 2026-07 from https://www.stern.nyu.edu/~adamodar/pc/datasets/histretSP.xls.
export const SP500_ANNUAL_RETURNS = [
  43.81, -8.3, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74, 31.94, -35.34, 29.28, -1.1, -10.67,
  -12.77, 19.17, 25.06, 19.03, 35.82, -8.43, 5.2, 5.7, 18.3, 30.81, 23.68, 18.15, -1.21, 52.56,
  32.6, 7.44, -10.46, 43.72, 12.06, 0.34, 26.64, -8.81, 22.61, 16.42, 12.4, -9.97, 23.8, 10.81,
  -8.24, 3.56, 14.22, 18.76, -14.31, -25.9, 37.0, 23.83, -6.98, 6.51, 18.52, 31.74, -4.7, 20.42,
  22.34, 6.15, 31.24, 18.49, 5.81, 16.54, 31.48, -3.06, 30.23, 7.49, 9.97, 1.33, 37.2, 22.68, 33.1,
  28.34, 20.89, -9.03, -11.85, -21.97, 28.36, 10.74, 4.83, 15.61, 5.48, -36.55, 25.94, 14.82, 2.1,
  15.89, 32.15, 13.52, 1.38, 11.77, 21.61, -4.23, 31.21, 18.02, 28.47, -18.04, 26.06, 24.88, 17.72,
]

export const SP500_MEAN_RETURN =
  SP500_ANNUAL_RETURNS.reduce((sum, r) => sum + r, 0) / SP500_ANNUAL_RETURNS.length

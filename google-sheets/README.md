# Rent vs Buy Calculator — Google Sheets version

A Google Apps Script that builds a live-formula spreadsheet replica of the
[Rent vs Buy calculator](../README.md): a deterministic 30-year projection
plus a 500-trial correlated Monte Carlo simulation, driven entirely by
Google Sheets formulas from one `Inputs` tab.

## Setup (one-time, ~1 minute)

1. Create a new blank Google Sheet at [sheets.new](https://sheets.new).
2. Go to **Extensions > Apps Script**.
3. Delete the placeholder `myFunction()` code and paste in the entire
   contents of [`RentVsBuyCalculator.gs`](./RentVsBuyCalculator.gs).
4. Save (Ctrl/Cmd+S), then click **Run** (▶) with `createCalculatorWorkbook`
   selected in the function dropdown.
5. The first run asks you to authorize the script (it only touches this one
   spreadsheet) — click through the Google permission prompts.
6. Wait ~30-60 seconds. The script builds ~150,000 formula cells for the
   Monte Carlo tabs; a popup confirms when it's done. Don't close the tab
   while it's running.
7. Reload the spreadsheet once — this activates the **Rent vs Buy** menu
   (top menu bar, next to Help).

You now have six tabs: `Inputs`, `HistoricalData`, `Deterministic`,
`MonteCarlo_Draws`, `MonteCarlo_Trials`, `MonteCarlo`.

## Using it

- **Change any assumption** on the `Inputs` tab (home price, mortgage rate,
  tax rates, appreciation, which investment vehicle the renter uses, etc.)
  — `Deterministic` and `MonteCarlo` recalculate immediately, no extra
  steps needed.
- **Resample Monte Carlo** (menu: Rent vs Buy > Resample Monte Carlo) draws
  a fresh set of 500 x 30 random historical years. You don't need to do
  this after every input change — the 500 trials stay fixed and all the
  downstream math (recentering, taxes, net worth) reacts live to your
  inputs regardless. Resample only when you want a different random sample
  (e.g. to see how much the percentile bands move trial-set to trial-set).
- **Rebuild Entire Workbook** (same menu) tears down and rebuilds every tab
  from scratch — use this if you've accidentally broken a formula and want
  a clean slate. It does not preserve any Inputs changes you made.

## Why "Resample" is a manual step

Google Sheets' `RANDBETWEEND` recalculates on every single edit by default.
With 500 trials, that would make the sheet crawl every time you touched a
slider. Instead, the random year-draws are generated once, then **frozen**
into plain numbers immediately after — so editing an Input cell only
re-runs plain arithmetic (fast), not fresh randomization. Clicking Resample
is the only way to get a new random sample.

## Known edge cases

- **0% mortgage rate**: handled with an explicit `IF` guard (falls back to
  straight-line loan/interest math) — the standard amortization formula
  divides by the rate and would otherwise error.
- **100% down payment** (loan amount = $0): the itemized-deduction ratio
  formula guards against dividing by zero and correctly treats the
  (nonexistent) loan as fully deductible.
- These mirror how the original app's JS handles the same edge cases
  (JavaScript's `1/0 = Infinity` silently does the right thing; Sheets
  needs an explicit `IF` instead).

## Design notes

- **30 rows per year, not 360 monthly rows.** The app's monthly loop only
  changes appreciation/inflation at year boundaries, so a year's 12 monthly
  compounding steps collapse exactly into a standard annuity/amortization
  closed form — verified bit-for-bit against the live app's actual output
  before this was built. This is what makes 500 Monte Carlo trials
  (15,000 cells per series instead of 180,000) tractable in a spreadsheet.
- **Shared vs. trial-specific math.** Mortgage amortization and the
  rent/insurance/maintenance inflation schedule don't depend on anything
  random — they're identical in every trial, computed once on the
  `Deterministic` tab and referenced from `MonteCarlo_Trials` rather than
  recomputed 500 times.
- **One-year lag on appreciation/inflation.** Year 1 always uses your raw
  Input values unchanged; Year 2 is the first year that reflects one
  year of appreciation/inflation. This matches the live app exactly (not a
  simplification) — it's a quirk of when the app's monthly loop applies
  those updates.

## Optional enhancement: shaded percentile band

The `MonteCarlo` tab's chart shows six lines (P10/Median/P90 for buyer and
renter, dashed bounds) rather than a shaded band like the web app's fan
chart — Apps Script's charting API can't reliably build a stacked-area
band without live testing that isn't possible in a paste-and-run script.
If you want the shaded look, you can build it manually in Sheets:
1. Add helper columns for `BuyerP90-BuyerP10` and `RenterP90-RenterP10`
   ("band height") next to the existing `MonteCarlo` columns.
2. Insert a new chart, type "Stacked Area", with series
   `[BuyerP10 (set to no fill/white), BandHeight (semi-transparent fill)]`.
3. Add `BuyerMedian`/`RenterMedian` as an additional line series via the
   chart editor's "Series" panel (set that series' chart type to "Line").

## Source of truth

This is a port of `src/simulation.js` and `src/monteCarlo.js` in the main
React app — if those files ever change, this spreadsheet will drift out of
sync and needs to be regenerated/updated by hand.

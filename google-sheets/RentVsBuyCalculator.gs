/**
 * Rent vs Buy Calculator — Google Sheets port.
 *
 * Paste this entire file into Extensions > Apps Script in a blank Google
 * Sheet, save, then run `createCalculatorWorkbook` once (Run menu). See
 * README.md in this folder for full instructions.
 *
 * Mirrors the math in the React app's src/simulation.js and
 * src/monteCarlo.js. Every formula below was verified bit-for-bit against
 * the live app's actual output (deterministic engine, and the Monte Carlo
 * engine with fixed historical-year draws standing in for random ones)
 * before being transcribed here — see the plan this was built from.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const YEARS = 30;
const MC_TRIALS = 500;

// [year, stocks%, treasuries%, gold%, homePrice%] — 1987-2025, from
// src/data/correlatedHistoricalYears.js. The same shared-year bootstrap the
// app's Monte Carlo simulation draws from.
const HISTORICAL_DATA = [
  [1987, 5.81, -4.96, 24.53, 7.61],
  [1988, 16.54, 8.22, -15.26, 7.34],
  [1989, 31.48, 17.69, -2.84, 3.95],
  [1990, -3.06, 6.24, -3.11, -1.3],
  [1991, 30.23, 15, -8.56, 0.23],
  [1992, 7.49, 9.36, -5.73, 0.92],
  [1993, 9.97, 14.21, 17.68, 2.36],
  [1994, 1.33, -8.04, -2.17, 2.34],
  [1995, 37.2, 23.48, 0.98, 1.75],
  [1996, 22.68, 1.43, -4.59, 2.58],
  [1997, 33.1, 9.94, -21.41, 4.35],
  [1998, 28.34, 14.92, -0.83, 6.37],
  [1999, 20.89, -8.25, 0.85, 7.86],
  [2000, -9.03, 16.66, -5.44, 9.22],
  [2001, -11.85, 5.57, 0.75, 6.61],
  [2002, -21.97, 15.12, 25.57, 9.63],
  [2003, 28.36, 0.38, 19.89, 10.22],
  [2004, 10.74, 4.49, 4.65, 13.81],
  [2005, 4.83, 2.87, 17.77, 12.93],
  [2006, 15.61, 1.96, 23.2, 1.04],
  [2007, 5.48, 10.21, 31.92, -6.37],
  [2008, -36.55, 20.1, 4.32, -12.69],
  [2009, 25.94, -11.12, 25.04, -2.92],
  [2010, 14.82, 8.46, 29.24, -4.12],
  [2011, 2.1, 16.04, 12.02, -3.51],
  [2012, 15.89, 2.97, 5.68, 7.56],
  [2013, 32.15, -9.1, -27.61, 10.44],
  [2014, 13.52, 10.75, 0.12, 4.31],
  [2015, 1.38, 1.28, -12.11, 5.28],
  [2016, 11.77, 0.69, 8.1, 5.5],
  [2017, 21.61, 2.8, 12.66, 6.2],
  [2018, -4.23, -0.02, -0.93, 4.12],
  [2019, 31.21, 9.64, 19.08, 4.01],
  [2020, 18.02, 11.33, 24.17, 11.31],
  [2021, 28.47, -4.42, -3.75, 19.25],
  [2022, -18.04, -17.83, 0.55, 3.83],
  [2023, 26.06, 3.88, 13.26, 6.17],
  [2024, 24.88, -1.64, 25.96, 4.16],
  [2025, 17.72, 7.8, 66.22, 0.94],
];

// Inputs tab rows 2-22, in order — [label, value, kind]. kind drives data
// validation: 'checkbox', 'vehicle' (dropdown), or undefined (plain number).
// Row numbers here are load-bearing: every formula below hardcodes
// Inputs!$B$<row>, so this order must not change without updating them.
const DEFAULT_INPUTS = [
  ['Home Price', 650000],
  ['Monthly Rent', 2800],
  ['Down Payment %', 20],
  ['Mortgage Rate %', 6.5],
  ['Property Tax Rate %', 1.1],
  ['Monthly HOA', 250],
  ['Home Insurance (Annual)', 1200],
  ['Yearly Maintenance', 3000],
  ['Apply Prop 13 Cap?', true, 'checkbox'],
  ['Selling Cost %', 7],
  ['Apply Itemized Deduction?', true, 'checkbox'],
  ['Marginal Tax Rate %', 24],
  ['State Tax Rate %', 9.3],
  ['Investment Vehicle', 'stocks', 'vehicle'],
  ['Target Return % (selected vehicle)', 7],
  ['Home Appreciation %', 3.5],
  ['Rent Inflation %', 3],
  ['Insurance Inflation %', 4],
  ['Maintenance Inflation %', 3],
  ['Capital Gains Tax Rate %', 15],
  ['Married Filing Jointly?', true, 'checkbox'],
];

// MonteCarlo_Trials block layout — stacked vertically, one block per
// trial-varying quantity. BLOCK_HEIGHT = 1 header row + 30 data rows + 1
// blank separator row.
const BLOCK_HEIGHT = 32;
const TRIAL_BLOCKS = [
  'HomeAppreciationSampled',
  'VehicleReturnSampled',
  'HomeValue',
  'AssessedValue',
  'YearPropertyTaxPaid',
  'ItemizedMonthlySavings',
  'MonthlySavings',
  'Portfolio',
  'CostBasis',
  'BuyerNetWorth',
  'RenterNetWorth',
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** 1-indexed column number -> A1 letter(s), e.g. 1 -> "A", 27 -> "AA". */
function colLetter(col) {
  let s = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function blockHeaderRow(blockName) {
  const i = TRIAL_BLOCKS.indexOf(blockName);
  if (i === -1) throw new Error('Unknown block: ' + blockName);
  return 1 + i * BLOCK_HEIGHT;
}

function blockDataStart(blockName) {
  return blockHeaderRow(blockName) + 1;
}

/** Row number (no column) for a given block + year, in MonteCarlo_Trials. */
function blockRow(blockName, year) {
  return blockDataStart(blockName) + (year - 1);
}

/** Same-sheet cell reference into MonteCarlo_Trials for (block, year, trial column). */
function tref(blockName, year, col) {
  return `${colLetter(col)}${blockRow(blockName, year)}`;
}

/** Cross-sheet reference into MonteCarlo_Draws for (year, trial column). */
function dref(year, col) {
  return `MonteCarlo_Draws!${colLetter(col)}${year + 1}`;
}

/** Cross-sheet reference into Deterministic for (column letter, year). */
function detref(col, year) {
  return `Deterministic!${col}${year + 1}`;
}

function getOrCreateSheet(ss, name) {
  const existing = ss.getSheetByName(name);
  if (existing) ss.deleteSheet(existing);
  return ss.insertSheet(name);
}

// ---------------------------------------------------------------------------
// Tab builders
// ---------------------------------------------------------------------------

function buildInputsTab(ss) {
  const sheet = getOrCreateSheet(ss, 'Inputs');
  sheet.getRange('A1').setValue('Rent vs Buy — Inputs').setFontWeight('bold').setFontSize(13);

  sheet.getRange(2, 1, DEFAULT_INPUTS.length, 1).setValues(DEFAULT_INPUTS.map((r) => [r[0]]));
  sheet.getRange(2, 2, DEFAULT_INPUTS.length, 1).setValues(DEFAULT_INPUTS.map((r) => [r[1]]));
  sheet.getRange(2, 1, DEFAULT_INPUTS.length, 1).setFontWeight('bold');

  DEFAULT_INPUTS.forEach((row, i) => {
    const cell = sheet.getRange(2 + i, 2);
    if (row[2] === 'checkbox') {
      cell.insertCheckboxes();
    } else if (row[2] === 'vehicle') {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['stocks', 'treasuries', 'gold'], true)
        .setAllowInvalid(false)
        .build();
      cell.setDataValidation(rule);
    }
  });

  // Derived constants, rows 24-33 — computed once, referenced everywhere downstream.
  const derived = [
    ['Down Payment ($)', '=B2*B4/100'],
    ['Loan Amount ($)', '=B2-B24'],
    ['Monthly Mortgage Rate', '=B5/100/12'],
    ['Mortgage Payment (monthly)', '=IF(B26=0, B25/360, B25*B26*(1+B26)^360/((1+B26)^360-1))'],
    ['Assessed Value Growth Rate % (deterministic)', '=IF(B10, MIN(B17,2), B17)'],
    ['Deductible Interest Ratio', '=IF(B25=0, 1, MIN(1, 750000/B25))'],
    ['Standard Deduction', '=IF(B22, 30000, 15000)'],
    ['Home Sale Exclusion', '=IF(B22, 500000, 250000)'],
    ['Effective Marginal Rate %', '=B13+B14'],
    ['Effective Capital Gains Rate %', '=B21+B14'],
  ];
  sheet.getRange(24, 1, derived.length, 1).setValues(derived.map((r) => [r[0]]));
  sheet.getRange(24, 2, derived.length, 1).setFormulas(derived.map((r) => [r[1]]));
  sheet.getRange(24, 1, derived.length, 1).setFontStyle('italic');

  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 120);
  return sheet;
}

function buildHistoricalDataTab(ss) {
  const sheet = getOrCreateSheet(ss, 'HistoricalData');
  sheet
    .getRange(1, 1, 1, 5)
    .setValues([['Year', 'Stocks %', 'Treasuries %', 'Gold %', 'HomePrice %']])
    .setFontWeight('bold');
  sheet.getRange(2, 1, HISTORICAL_DATA.length, 5).setValues(HISTORICAL_DATA);

  // Self-updating means over the same 39-row window the app uses — not
  // hardcoded, so this stays correct if the table is ever edited/extended.
  sheet.getRange('A42').setValue('Mean (Stocks)');
  sheet.getRange('B42').setFormula('=AVERAGE(B2:B40)');
  sheet.getRange('A43').setValue('Mean (Treasuries)');
  sheet.getRange('B43').setFormula('=AVERAGE(C2:C40)');
  sheet.getRange('A44').setValue('Mean (Gold)');
  sheet.getRange('B44').setFormula('=AVERAGE(D2:D40)');
  sheet.getRange('A45').setValue('Mean (HomePrice)');
  sheet.getRange('B45').setFormula('=AVERAGE(E2:E40)');

  // Helper: whichever vehicle is currently selected on Inputs, per
  // historical year (col F) and its mean (B46) — avoids repeating the
  // MATCH lookup across thousands of Monte Carlo formulas.
  sheet.getRange('F1').setValue('Selected Vehicle Return %').setFontWeight('bold');
  const helperFormulas = [];
  for (let r = 2; r <= 40; r++) {
    helperFormulas.push([`=INDEX(B${r}:D${r},1,MATCH(Inputs!$B$15,{"stocks","treasuries","gold"},0))`]);
  }
  sheet.getRange(2, 6, 39, 1).setFormulas(helperFormulas);
  sheet.getRange('A46').setValue('Selected Vehicle Mean');
  sheet
    .getRange('B46')
    .setFormula('=INDEX(B42:D42,1,MATCH(Inputs!$B$15,{"stocks","treasuries","gold"},0))');

  sheet.setColumnWidths(1, 6, 110);
  return sheet;
}

function buildDeterministicTab(ss) {
  const sheet = getOrCreateSheet(ss, 'Deterministic');
  const headers = [
    'Year', 'HomeValue', 'AssessedValue', 'Rent', 'HomeInsurance', 'Maintenance',
    'LoanBalance', 'YearInterestPaid', 'YearPropertyTaxPaid', 'ItemizedMonthlySavings',
    'MonthlySavings', 'Portfolio', 'CostBasis', 'BuyerNetWorth', 'RenterNetWorth',
    'MonthlyStockReturn',
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  // Row 2 = Year 1, seeded directly from Inputs — no compounding applied
  // yet, matching the app's monthly loop (appreciation/inflation never
  // trigger during months 1-12; verified against the live app).
  const row2Formulas = {
    A: '=1',
    B: '=Inputs!$B$2',
    C: '=Inputs!$B$2',
    D: '=Inputs!$B$3',
    E: '=Inputs!$B$8',
    F: '=Inputs!$B$9',
    G:
      '=IF(Inputs!$B$26=0, MAX(0,Inputs!$B$25-Inputs!$B$27*12), ' +
      'MAX(0, Inputs!$B$25*(1+Inputs!$B$26)^12 - Inputs!$B$27*(((1+Inputs!$B$26)^12-1)/Inputs!$B$26)))',
    H: '=Inputs!$B$27*12 - (Inputs!$B$25 - G2)',
    I: '=C2*(Inputs!$B$6/100)',
    K: '=(Inputs!$B$27 + I2/12 + Inputs!$B$7 + E2/12 + F2/12 - J2) - D2',
    L: '=Inputs!$B$24*(1+Inputs!$B$16/100) + IF(K2>0, K2*(Inputs!$B$16/100)/P2, 0)',
    M: '=Inputs!$B$24 + IF(K2>0, K2*12, 0)',
    N:
      '=(B2*(1-Inputs!$B$11/100)) - G2 - (MAX(0, MAX(0,(B2*(1-Inputs!$B$11/100))-Inputs!$B$2) ' +
      '- Inputs!$B$31) * (Inputs!$B$33/100))',
    O: '=L2 - (Inputs!$B$33/100)*MAX(0, L2-M2)',
    P: '=(1+Inputs!$B$16/100)^(1/12)-1',
  };
  Object.keys(row2Formulas).forEach((col) => {
    sheet.getRange(`${col}2`).setFormula(row2Formulas[col]);
  });
  sheet.getRange('J2').setValue(0); // literal — no prior year exists yet

  // Rows 3-31 (Years 2-30) — one uniform formula per column.
  const formulaFor = (col, r) => {
    const p = r - 1;
    switch (col) {
      case 'A': return `=A${p}+1`;
      case 'B': return `=B${p}*(1+Inputs!$B$17/100)`;
      case 'C': return `=C${p}*(1+Inputs!$B$28/100)`;
      case 'D': return `=D${p}*(1+Inputs!$B$18/100)`;
      case 'E': return `=E${p}*(1+Inputs!$B$19/100)`;
      case 'F': return `=F${p}*(1+Inputs!$B$20/100)`;
      case 'G':
        return (
          `=IF(Inputs!$B$26=0, MAX(0,G${p}-Inputs!$B$27*12), ` +
          `MAX(0, G${p}*(1+Inputs!$B$26)^12 - Inputs!$B$27*(((1+Inputs!$B$26)^12-1)/Inputs!$B$26)))`
        );
      case 'H': return `=Inputs!$B$27*12 - (G${p}-G${r})`;
      case 'I': return `=C${r}*(Inputs!$B$6/100)`;
      case 'J':
        return (
          `=IF(Inputs!$B$12, MAX(0, H${p}*Inputs!$B$29 + MIN(I${p},10000) - Inputs!$B$30)` +
          `*(Inputs!$B$32/100)/12, 0)`
        );
      case 'K': return `=(Inputs!$B$27 + I${r}/12 + Inputs!$B$7 + E${r}/12 + F${r}/12 - J${r}) - D${r}`;
      case 'L': return `=L${p}*(1+Inputs!$B$16/100) + IF(K${r}>0, K${r}*(Inputs!$B$16/100)/P${r}, 0)`;
      case 'M': return `=M${p} + IF(K${r}>0, K${r}*12, 0)`;
      case 'N':
        return (
          `=(B${r}*(1-Inputs!$B$11/100)) - G${r} - (MAX(0, MAX(0,(B${r}*(1-Inputs!$B$11/100))` +
          `-Inputs!$B$2) - Inputs!$B$31)*(Inputs!$B$33/100))`
        );
      case 'O': return `=L${r} - (Inputs!$B$33/100)*MAX(0, L${r}-M${r})`;
      case 'P': return `=(1+Inputs!$B$16/100)^(1/12)-1`;
      default: throw new Error('unhandled column ' + col);
    }
  };
  'ABCDEFGHIJKLMNOP'.split('').forEach((col, i) => {
    const formulas = [];
    for (let r = 3; r <= 31; r++) formulas.push([formulaFor(col, r)]);
    sheet.getRange(3, i + 1, 29, 1).setFormulas(formulas);
  });

  sheet.getRange('R1').setValue('Break-even Year:');
  sheet
    .getRange('S1')
    .setFormula('=IFERROR(INDEX(A2:A31, MATCH(TRUE, N2:N31>O2:O31, 0)), "Renting Wins")');

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function buildMonteCarloDrawsTab(ss) {
  const sheet = getOrCreateSheet(ss, 'MonteCarlo_Draws');
  sheet.getRange('A1').setValue('Year').setFontWeight('bold');
  const trialHeaders = [];
  for (let c = 1; c <= MC_TRIALS; c++) trialHeaders.push(`Trial ${c}`);
  sheet.getRange(1, 2, 1, MC_TRIALS).setValues([trialHeaders]).setFontWeight('bold');

  const yearLabels = [];
  for (let y = 1; y <= YEARS; y++) yearLabels.push([y]);
  sheet.getRange(2, 1, YEARS, 1).setValues(yearLabels);

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  return sheet;
}

function buildMonteCarloTrialsTab(ss) {
  const sheet = getOrCreateSheet(ss, 'MonteCarlo_Trials');

  TRIAL_BLOCKS.forEach((name) => {
    sheet.getRange(blockHeaderRow(name), 1).setValue(name).setFontWeight('bold');
    const dataStart = blockDataStart(name);
    const yearLabels = [];
    for (let y = 1; y <= YEARS; y++) yearLabels.push([y]);
    sheet.getRange(dataStart, 1, YEARS, 1).setValues(yearLabels);
  });

  /** Writes a block whose formula is the same shape for every year (1-30). */
  function writeUniform(blockName, formulaFn) {
    const dataStart = blockDataStart(blockName);
    const formulas = [];
    for (let y = 1; y <= YEARS; y++) {
      const row = [];
      for (let c = 2; c <= MC_TRIALS + 1; c++) row.push(formulaFn(y, c));
      formulas.push(row);
    }
    sheet.getRange(dataStart, 2, YEARS, MC_TRIALS).setFormulas(formulas);
  }

  /** Writes a block whose year-1 row differs from years 2-30. */
  function writeSeeded(blockName, seedFn, recurFn) {
    const dataStart = blockDataStart(blockName);
    const seedRow = [];
    for (let c = 2; c <= MC_TRIALS + 1; c++) seedRow.push(seedFn(c));
    sheet.getRange(dataStart, 2, 1, MC_TRIALS).setFormulas([seedRow]);

    const formulas = [];
    for (let y = 2; y <= YEARS; y++) {
      const row = [];
      for (let c = 2; c <= MC_TRIALS + 1; c++) row.push(recurFn(y, c));
      formulas.push(row);
    }
    sheet.getRange(dataStart + 1, 2, YEARS - 1, MC_TRIALS).setFormulas(formulas);
  }

  // HomeAppreciationSampled — uniform; every row draws its own year's index.
  writeUniform('HomeAppreciationSampled', (year, c) => {
    return `=Inputs!$B$17 + (INDEX(HistoricalData!$E$2:$E$40, ${dref(year, c)}) - HistoricalData!$B$45)`;
  });

  // VehicleReturnSampled — uniform; every row draws its own year's index.
  writeUniform('VehicleReturnSampled', (year, c) => {
    return `=Inputs!$B$16 + (INDEX(HistoricalData!$F$2:$F$40, ${dref(year, c)}) - HistoricalData!$B$46)`;
  });

  // HomeValue — year 1 unchanged (raw input); years 2-30 grow from the
  // prior row using THIS row's own sampled appreciation.
  writeSeeded(
    'HomeValue',
    () => '=Inputs!$B$2',
    (year, c) => `=${tref('HomeValue', year - 1, c)}*(1+${tref('HomeAppreciationSampled', year, c)}/100)`,
  );

  // AssessedValue — same shape as HomeValue, but Prop13-capped per year.
  writeSeeded(
    'AssessedValue',
    () => '=Inputs!$B$2',
    (year, c) => {
      const appr = tref('HomeAppreciationSampled', year, c);
      const growth = `IF(Inputs!$B$10, MIN(${appr},2), ${appr})`;
      return `=${tref('AssessedValue', year - 1, c)}*(1+${growth}/100)`;
    },
  );

  // YearPropertyTaxPaid — uniform; uses THIS year's (already-lagged) assessed value.
  writeUniform('YearPropertyTaxPaid', (year, c) => {
    return `=${tref('AssessedValue', year, c)}*(Inputs!$B$6/100)`;
  });

  // ItemizedMonthlySavings — year 1 has no prior-year data (0); years 2-30
  // use the SHARED Deterministic interest (identical every trial) and this
  // trial's own prior-year property tax.
  writeSeeded(
    'ItemizedMonthlySavings',
    () => '=0',
    (year, c) => {
      const priorTax = tref('YearPropertyTaxPaid', year - 1, c);
      return (
        `=IF(Inputs!$B$12, MAX(0, ${detref('H', year - 1)}*Inputs!$B$29 + MIN(${priorTax},10000) ` +
        `- Inputs!$B$30)*(Inputs!$B$32/100)/12, 0)`
      );
    },
  );

  // MonthlySavings — uniform; mortgage/HOA/rent/insurance/maintenance are
  // shared across all trials (reference Deterministic directly).
  writeUniform('MonthlySavings', (year, c) => {
    return (
      `=(Inputs!$B$27 + ${tref('YearPropertyTaxPaid', year, c)}/12 + Inputs!$B$7 + ` +
      `${detref('E', year)}/12 + ${detref('F', year)}/12 - ${tref('ItemizedMonthlySavings', year, c)}) ` +
      `- ${detref('D', year)}`
    );
  });

  // Portfolio — ordinary-annuity closed form using THIS year's own sampled
  // vehicle return (verified bit-exact against the monthly loop).
  writeSeeded(
    'Portfolio',
    (c) => {
      const veh = tref('VehicleReturnSampled', 1, c);
      const ms = tref('MonthlySavings', 1, c);
      return (
        `=Inputs!$B$24*(1+${veh}/100) + IF(${ms}>0, ${ms}*(${veh}/100)/((1+${veh}/100)^(1/12)-1), 0)`
      );
    },
    (year, c) => {
      const veh = tref('VehicleReturnSampled', year, c);
      const ms = tref('MonthlySavings', year, c);
      return (
        `=${tref('Portfolio', year - 1, c)}*(1+${veh}/100) + ` +
        `IF(${ms}>0, ${ms}*(${veh}/100)/((1+${veh}/100)^(1/12)-1), 0)`
      );
    },
  );

  // CostBasis
  writeSeeded(
    'CostBasis',
    (c) => {
      const ms = tref('MonthlySavings', 1, c);
      return `=Inputs!$B$24 + IF(${ms}>0, ${ms}*12, 0)`;
    },
    (year, c) => {
      const ms = tref('MonthlySavings', year, c);
      return `=${tref('CostBasis', year - 1, c)} + IF(${ms}>0, ${ms}*12, 0)`;
    },
  );

  // BuyerNetWorth — uniform; loan balance is shared (Deterministic tab).
  writeUniform('BuyerNetWorth', (year, c) => {
    const hv = tref('HomeValue', year, c);
    return (
      `=(${hv}*(1-Inputs!$B$11/100)) - ${detref('G', year)} - (MAX(0, MAX(0,(${hv}*` +
      `(1-Inputs!$B$11/100))-Inputs!$B$2) - Inputs!$B$31)*(Inputs!$B$33/100))`
    );
  });

  // RenterNetWorth — uniform.
  writeUniform('RenterNetWorth', (year, c) => {
    const port = tref('Portfolio', year, c);
    const cb = tref('CostBasis', year, c);
    return `=${port} - (Inputs!$B$33/100)*MAX(0, ${port}-${cb})`;
  });

  sheet.setFrozenColumns(1);
  return sheet;
}

function buildMonteCarloSummaryTab(ss) {
  const sheet = getOrCreateSheet(ss, 'MonteCarlo');
  const headers = ['Year', 'BuyerP10', 'BuyerMedian', 'BuyerP90', 'RenterP10', 'RenterMedian', 'RenterP90'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  const yearLabels = [];
  for (let y = 1; y <= YEARS; y++) yearLabels.push([y]);
  sheet.getRange(2, 1, YEARS, 1).setValues(yearLabels);

  const lastCol = colLetter(MC_TRIALS + 1); // trial columns start at B
  const formulas = [];
  for (let y = 1; y <= YEARS; y++) {
    const buyerRow = blockRow('BuyerNetWorth', y);
    const renterRow = blockRow('RenterNetWorth', y);
    const buyerRange = `MonteCarlo_Trials!B${buyerRow}:${lastCol}${buyerRow}`;
    const renterRange = `MonteCarlo_Trials!B${renterRow}:${lastCol}${renterRow}`;
    formulas.push([
      `=PERCENTILE(${buyerRange}, 0.1)`,
      `=PERCENTILE(${buyerRange}, 0.5)`,
      `=PERCENTILE(${buyerRange}, 0.9)`,
      `=PERCENTILE(${renterRange}, 0.1)`,
      `=PERCENTILE(${renterRange}, 0.5)`,
      `=PERCENTILE(${renterRange}, 0.9)`,
    ]);
  }
  sheet.getRange(2, 2, YEARS, 6).setFormulas(formulas);

  const y30BuyerRow = blockRow('BuyerNetWorth', YEARS);
  const y30RenterRow = blockRow('RenterNetWorth', YEARS);
  sheet.getRange('I1').setValue('Buyer Win Probability');
  sheet
    .getRange('I2')
    .setFormula(
      `=SUMPRODUCT((MonteCarlo_Trials!B${y30BuyerRow}:${lastCol}${y30BuyerRow} > ` +
        `MonteCarlo_Trials!B${y30RenterRow}:${lastCol}${y30RenterRow})*1) / ${MC_TRIALS}`,
    );

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

// ---------------------------------------------------------------------------
// Resample (the only volatile-formula range, frozen after each run)
// ---------------------------------------------------------------------------

const DRAWS_SHEET = 'MonteCarlo_Draws';

function resampleMonteCarlo() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DRAWS_SHEET);
  const range = sheet.getRange(2, 2, YEARS, MC_TRIALS);

  const formulas = [];
  for (let r = 0; r < YEARS; r++) {
    const row = [];
    for (let c = 0; c < MC_TRIALS; c++) row.push('=RANDBETWEEN(1,39)');
    formulas.push(row);
  }
  range.setFormulas(formulas);
  SpreadsheetApp.flush(); // let RANDBETWEEN evaluate before reading it back

  const values = range.getValues();
  range.setValues(values); // freeze as plain numbers — removes the volatility
  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(`Monte Carlo resampled: ${MC_TRIALS} trials x ${YEARS} years redrawn.`);
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function buildDeterministicChart(ss) {
  const sheet = ss.getSheetByName('Deterministic');
  const chart = sheet
    .newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange('A1:A31'))
    .addRange(sheet.getRange('N1:O31'))
    .setOption('title', 'Buy vs Rent — Net Worth Over 30 Years')
    .setOption('hAxis', { title: 'Year' })
    .setOption('vAxis', { title: 'Net Worth ($)' })
    .setPosition(2, 18, 0, 0)
    .build();
  sheet.insertChart(chart);
}

function buildMonteCarloChart(ss) {
  const sheet = ss.getSheetByName('MonteCarlo');
  // Reliable "bracket" chart: 6 lines (P10/Median/P90 per side) rather than
  // a true shaded band, which isn't reliably buildable via this API without
  // live testing. Dashed lines mark the P10/P90 bounds.
  const chart = sheet
    .newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange('A1:G31'))
    .setOption('title', 'Monte Carlo — Buyer vs Renter Net Worth (P10 / Median / P90)')
    .setOption('hAxis', { title: 'Year' })
    .setOption('vAxis', { title: 'Net Worth ($)' })
    .setOption('series', {
      0: { color: '#6366f1', lineDashStyle: [4, 4] },
      1: { color: '#6366f1' },
      2: { color: '#6366f1', lineDashStyle: [4, 4] },
      3: { color: '#10b981', lineDashStyle: [4, 4] },
      4: { color: '#10b981' },
      5: { color: '#10b981', lineDashStyle: [4, 4] },
    })
    .setPosition(2, 10, 0, 0)
    .build();
  sheet.insertChart(chart);
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Rent vs Buy')
    .addItem('Resample Monte Carlo', 'resampleMonteCarlo')
    .addItem('Rebuild Entire Workbook', 'createCalculatorWorkbook')
    .addToUi();
}

function createCalculatorWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildInputsTab(ss);
  buildHistoricalDataTab(ss);
  buildDeterministicTab(ss);
  buildMonteCarloDrawsTab(ss);
  buildMonteCarloTrialsTab(ss);
  buildMonteCarloSummaryTab(ss);
  resampleMonteCarlo();
  buildDeterministicChart(ss);
  buildMonteCarloChart(ss);
  ss.setActiveSheet(ss.getSheetByName('Inputs'));
  SpreadsheetApp.getUi().alert('Rent vs Buy calculator built successfully.');
}

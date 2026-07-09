---
marp: true
theme: default
paginate: true
backgroundColor: #020617
color: #e2e8f0
style: |
  section {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 60px 70px;
  }
  h1 {
    color: #ffffff;
    font-size: 2.4em;
    border: none;
  }
  h2 {
    color: #ffffff;
    font-size: 1.6em;
    border: none;
  }
  strong { color: #818cf8; }
  a { color: #34d399; }
  section.lead {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  section.lead h1 {
    font-size: 2.8em;
    border: none;
    color: #818cf8;
  }
  img {
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  }
  table {
    color: #e2e8f0;
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    padding: 10px 16px;
  }
  th {
    color: #818cf8;
  }
---

<!-- _class: lead -->

# Hyper-Local Rent vs. Buy
## Opportunity Cost Calculator

A rent-vs-buy calculator that doesn't ignore what your down payment could have earned you elsewhere.

**Live now:** onevvish.github.io/rentVsbuy

---

## The Problem

Every rent-vs-buy calculator online asks the same lopsided question:

> "Is your monthly mortgage payment more or less than rent?"

That's the wrong comparison. It ignores the single biggest number in the decision:

**What if you invested your down payment instead of locking it into a house?**

A $130K down payment invested in the market for 30 years can be worth **over a million dollars** on its own — most calculators pretend that opportunity doesn't exist.

---

## The Solution

A calculator that runs the comparison honestly:

- **Buyer** — builds home equity, pays the mortgage, taxes, insurance, maintenance
- **Renter** — invests the down payment *and* whatever they save each month vs. the buyer's costs

Every dollar of "if you didn't buy, where would that money go?" is tracked, for 30 years, side by side.

---

## Hyper-Local to California

Type a zip code, get real defaults for that market instantly:

- Home price & comparable rent
- Local property tax rate
- 35+ major CA metros mapped exactly; every other CA zip falls back to a regional estimate

![height:360px](assets/zip-lookup.png)

---

## Skip the Typing

Drop in a screenshot of a Zillow listing — price, rent estimate, property
tax, and HOA get pulled out automatically via on-device OCR. Nothing
applies silently: every extracted value is shown for review first.

---

## One Clear Answer: When Does Buying Win?

- **Break-even year** — the year buying's net worth overtakes renting's
- Full 30-year net worth chart for both paths
- Real costs modeled: mortgage, property tax, insurance, maintenance, selling costs

![height:360px](assets/deterministic.png)

---

## Pick Your Own Investment

Not everyone would put the down payment in the stock market. Choose:

- **Stocks** — S&P 500
- **Treasury bonds** — steady, low-volatility
- **Gold** — no yield, historically choppier

Every option is backed by its own real 1987–2025 historical returns.

---

## Beyond a Single Guess: Monte Carlo Risk

Markets don't move in a straight line. Toggle to see a **range of outcomes**, not just one — and a *correlated* one:

- 500 simulated 30-year scenarios, each year drawn from a real historical
  calendar year (1987–2025)
- Stock/bond/gold return AND home-price change for that simulated year come
  from the **same actual year** — a simulated 2008 pairs the real stock
  crash with the real housing downturn, not a random mismatch
- Result: "buying wins in 64% of outcomes" — with a real percentile range,
  not false precision

![height:360px](assets/montecarlo.png)

---

## Full Tax Picture, Not Just the Basics

Most calculators stop at property tax. This one models what actually shows up on a tax return:

| Feature | What it captures |
|---|---|
| **Prop 13 cap** | CA property tax assessment capped at 2%/year growth |
| **Itemized deductions** | Mortgage interest + property tax vs. standard deduction |
| **Section 121 exclusion** | Home-sale gains tax-free up to $250K / $500K |
| **Capital gains tax** | On the renter's investment gains, federal + state |

---

## Make It Yours, Share It, Keep It

- **Property Address** — label exactly which listing you're analyzing
- **Save as My Defaults** — set your own baseline, reset back to it any time
- **Share Scenario** — one click encodes every input into a link; send
  someone your exact numbers, no accounts or re-entering data
- **Download PDF Report** — the full analysis, one click away

---

## Take It Anywhere: Google Sheets

The full model — deterministic engine and all 500 Monte Carlo trials — also
runs as a live-formula Google Sheet. Paste in one script, and every number
recalculates from your own inputs, no web app required.

---

## Try It Right Now

# **onevvish.github.io/rentVsbuy**

Free. No sign-up. Live on GitHub Pages, auto-deployed on every update.

---

## What's Next

- Expand hyper-local defaults beyond California
- Model PMI for buyers under 20% down
- CA rent-control caps (AB 1482) on the Rent Inflation assumption
- Upfront closing costs as part of the renter's invested capital

---

<!-- _class: lead -->

# Questions?

**onevvish.github.io/rentVsbuy**
github.com/OneVVish/rentVsbuy

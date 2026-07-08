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
    font-size: 2.2em;
    border: none;
  }
  h2 {
    color: #ffffff;
    font-size: 1.5em;
    border: none;
  }
  h3 {
    color: #34d399;
    font-size: 1.1em;
    text-transform: uppercase;
    letter-spacing: 0.03em;
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
    font-size: 2.6em;
    border: none;
    color: #818cf8;
  }
  img {
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  }
  .question {
    display: inline-block;
    background: rgba(129, 140, 248, 0.15);
    border: 1px solid rgba(129, 140, 248, 0.4);
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 1.15em;
    font-style: italic;
    color: #c7d2fe;
    margin-bottom: 18px;
  }
---

<!-- _class: lead -->

# From One Chart to a Full Financial Model
## How the Rent vs. Buy Calculator Evolved

Every capability on the following slides started as a question — not a spec.

---

## Where We Started

Most rent-vs-buy calculators only compare monthly payments. Build one that
also asks what the down payment could have earned elsewhere.

- A 30-year net worth comparison, renter vs. buyer
- One clear answer: the **break-even year**

![height:280px](assets/deterministic.png)

---

<h3>The question</h3>

<p class="question">"How can we make this feel local, not generic?"</p>

## Zip-code-aware defaults

Type a zip code, get real market numbers instantly — home price, rent, and
property tax rate — instead of guessing at three unfamiliar sliders.

![height:280px](assets/zip-lookup.png)

---

<h3>The question</h3>

<p class="question">"What costs are we missing?"</p>

## Insurance and maintenance, modeled properly

Home insurance and maintenance don't inflate at the same pace as rent, so
they got their own sliders and their own inflation rates — not lumped
together as one vague "cost of owning" number.

The section was renamed from "Mortgage & Costs" to **"Homeownership Costs"**
to match what it actually covered by this point.

---

<h3>The question</h3>

<p class="question">"A single guess isn't good enough — what about risk?"</p>

## A second view: Monte Carlo simulation

Markets don't move in a straight line. A toggleable second view runs 500
simulated 30-year outcomes and shows a range, not false precision.

![height:280px](assets/montecarlo.png)

---

<h3>The question</h3>

<p class="question">"Can that simulation be grounded in real history, not a guess?"</p>

## Real market history, not invented statistics

The simulation originally sampled from a made-up statistical curve. It now
resamples from what actually happened:

- Real S&P 500 annual returns, **1928–2025**
- The real Case-Shiller national home price index, **1987–2025**

Every simulated year is a year that genuinely occurred, just reshuffled.

---

<h3>The question</h3>

<p class="question">"What about taxes — isn't that the biggest lever?"</p>

## Modeling what actually shows up on a tax return

- Mortgage interest and property tax deductions, weighed against the
  standard deduction
- Capital gains tax on the renter's investment gains
- The home-sale tax exclusion buyers get — $250K or $500K tax-free — which
  most calculators ignore entirely

---

<h3>The question</h3>

<p class="question">"Taxes got complicated — can we make sense of it?"</p>

## Giving taxes their own home

Every tax-related input moved into one dedicated section. A state tax rate
was added too, since California taxes investment gains as ordinary income —
another detail most calculators miss.

---

<h3>The question</h3>

<p class="question">"How do I share exactly what I'm looking at?"</p>

## One click, one link

Every input and every setting — encoded into a single URL. No accounts, no
saved files, no re-explaining your numbers to someone else.

---

<h3>The question</h3>

<p class="question">"Do I have to type in every number by hand?"</p>

## Upload a screenshot instead

Drop in a screenshot of a listing and the key numbers get pulled out
automatically. Nothing is applied silently — every extracted value is shown
for review and confirmation first.

---

<h3>The question</h3>

<p class="question">"Can I take this analysis with me?"</p>

## A real report, one click away

Your exact scenario — every chart, every input, every assumption — turns
into a clean, shareable document instead of living only on screen.

---

<h3>The question</h3>

<p class="question">"What if I don't want to bet on the stock market?"</p>

## Choose your own investment

Stocks, Treasury bonds, or gold — each with its own real historical data
behind it. Same rigor, whichever path you're actually weighing.

---

<!-- _class: lead -->

# Every Feature Started With a Question

None of this was planned upfront. Each capability came from asking
**"can we also..."** — and the model just kept getting more honest.

**onevvish.github.io/rentVsbuy**

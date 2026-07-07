// Best-effort extraction of listing figures from OCR'd Zillow screenshot text.
// Patterns are heuristic (Zillow's layout varies), so every result is meant to
// be shown to the user for confirmation, never applied silently.

function extractAmount(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ''), 10)
      if (Number.isFinite(num) && num > 0) return num
    }
  }
  return null
}

export function parseZillowScreenshot(rawText) {
  const text = rawText.replace(/\s+/g, ' ')

  const homePrice = extractAmount(text, [
    /(?<!rent )zestimate[®\s:]*\$\s?([\d,]+)/i,
    /\$\s?([\d,]{6,})/,
  ])

  const monthlyRent = extractAmount(text, [
    /rent zestimate[®\s:]*\$\s?([\d,]+)/i,
    /rent estimate[®\s:]*\$\s?([\d,]+)/i,
  ])

  const annualPropertyTax = extractAmount(text, [/property tax(?:es)?[^\d$]{0,20}\$\s?([\d,]+)/i])

  const monthlyHOA = extractAmount(text, [/hoa[^\d$]{0,20}\$\s?([\d,]+)/i])

  const propertyTaxRate =
    annualPropertyTax && homePrice
      ? Math.round((annualPropertyTax / homePrice) * 10000) / 100
      : null

  return { homePrice, monthlyRent, propertyTaxRate, monthlyHOA }
}

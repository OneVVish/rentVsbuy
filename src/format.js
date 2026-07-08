export function formatCurrency(value, compact = true) {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
      // Without this, whether "650000" renders as "$650K" or "$650.0K" depends
      // on the runtime's ICU data (observed differing between Node versions) —
      // pin it so the app renders identically everywhere.
      trailingZeroDisplay: 'stripIfInteger',
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

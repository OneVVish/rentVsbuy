import { describe, expect, it } from 'vitest'
import { formatCurrency } from './format.js'

describe('formatCurrency', () => {
  it('formats compactly by default', () => {
    expect(formatCurrency(650000)).toBe('$650K')
    expect(formatCurrency(1245000)).toBe('$1.2M')
  })

  it('formats full precision with no decimals when compact is false', () => {
    expect(formatCurrency(650000, false)).toBe('$650,000')
    expect(formatCurrency(1245000.5, false)).toBe('$1,245,001')
  })
})

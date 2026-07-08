import { describe, expect, it } from 'vitest'
import { getCaliforniaDefaults } from './californiaZipDefaults.js'

describe('getCaliforniaDefaults', () => {
  it('returns an exact match for a well-known zip', () => {
    const result = getCaliforniaDefaults('94301')
    expect(result.matchType).toBe('exact')
    expect(result.label).toBe('Palo Alto')
    expect(result.homePrice).toBeGreaterThan(0)
  })

  it('falls back to a regional band for an in-range but unlisted zip', () => {
    const result = getCaliforniaDefaults('93555')
    expect(result).not.toBeNull()
    expect(result.matchType).toBe('region')
  })

  it('returns null for a zip outside the California range', () => {
    expect(getCaliforniaDefaults('10001')).toBeNull()
  })

  it('returns null for malformed input', () => {
    expect(getCaliforniaDefaults('941')).toBeNull()
    expect(getCaliforniaDefaults('abcde')).toBeNull()
    expect(getCaliforniaDefaults('')).toBeNull()
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MAX_SAVED_SCENARIOS, addScenario, loadScenarios, removeScenario } from './scenarios.js'

function createMemoryStorage() {
  let store = {}
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
}

beforeEach(() => {
  global.localStorage = createMemoryStorage()
})

afterEach(() => {
  delete global.localStorage
})

describe('loadScenarios', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(loadScenarios()).toEqual([])
  })

  it('returns an empty array for corrupt storage instead of throwing', () => {
    localStorage.setItem('rentVsBuy.scenarios.v1', 'not json')
    expect(loadScenarios()).toEqual([])
  })

  it('returns an empty array if the stored value is not an array', () => {
    localStorage.setItem('rentVsBuy.scenarios.v1', JSON.stringify({ not: 'an array' }))
    expect(loadScenarios()).toEqual([])
  })
})

describe('addScenario', () => {
  it('appends a new scenario with a name and inputs snapshot', () => {
    const next = addScenario([], 'Baseline', { homePrice: 650000 })
    expect(next).toHaveLength(1)
    expect(next[0].name).toBe('Baseline')
    expect(next[0].inputs).toEqual({ homePrice: 650000 })
    expect(next[0].id).toBeTruthy()
  })

  it('persists to localStorage so a reload can restore it', () => {
    addScenario([], 'Baseline', { homePrice: 650000 })
    expect(loadScenarios()).toHaveLength(1)
  })

  it('refuses to add beyond the cap', () => {
    let scenarios = []
    for (let i = 0; i < MAX_SAVED_SCENARIOS; i++) {
      scenarios = addScenario(scenarios, `Scenario ${i}`, {})
    }
    expect(scenarios).toHaveLength(MAX_SAVED_SCENARIOS)
    const attempted = addScenario(scenarios, 'One too many', {})
    expect(attempted).toHaveLength(MAX_SAVED_SCENARIOS)
    expect(attempted).toBe(scenarios)
  })
})

describe('removeScenario', () => {
  it('removes only the matching id', () => {
    const withTwo = addScenario(addScenario([], 'A', {}), 'B', {})
    const [a, b] = withTwo
    const next = removeScenario(withTwo, a.id)
    expect(next).toEqual([b])
  })

  it('persists the removal', () => {
    const withOne = addScenario([], 'A', {})
    removeScenario(withOne, withOne[0].id)
    expect(loadScenarios()).toEqual([])
  })
})

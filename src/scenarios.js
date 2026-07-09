const STORAGE_KEY = 'rentVsBuy.scenarios.v1'

// Capped, not auto-evicted — a user should never silently lose a saved
// scenario. The UI disables saving once the cap is hit instead.
export const MAX_SAVED_SCENARIOS = 4

export function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(scenarios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
  } catch {
    // localStorage may be unavailable (e.g. private browsing) — comparison
    // still works for the current session, it just won't persist on reload.
  }
}

export function addScenario(scenarios, name, inputs) {
  if (scenarios.length >= MAX_SAVED_SCENARIOS) return scenarios
  const next = [...scenarios, { id: `${Date.now()}-${Math.random()}`, name, inputs }]
  persist(next)
  return next
}

export function removeScenario(scenarios, id) {
  const next = scenarios.filter((s) => s.id !== id)
  persist(next)
  return next
}

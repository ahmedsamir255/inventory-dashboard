const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3005'
  : `http://${window.location.hostname}:3002`

export async function fetchState() {
  const r = await fetch(`${BASE}/api/state`)
  if (!r.ok) throw new Error('fetch failed')
  return r.json()
}

export async function pushState(state: object) {
  await fetch(`${BASE}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
}

export async function ping(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/ping`, { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch { return false }
}

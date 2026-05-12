import type { BatchLookupResponse, LookupResult } from './types'

const API_BASE = 'https://proflens-api-production.up.railway.app'

export async function lookupProfessor(name: string): Promise<LookupResult> {
  const res = await fetch(`${API_BASE}/api/professors/lookup?name=${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function batchLookup(names: string[]): Promise<BatchLookupResponse> {
  const res = await fetch(`${API_BASE}/api/professors/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

const INVALID_NAMES = new Set([
  'tba', 'staff', 'to be announced', 'n/a', '',
  'online', 'web', 'independent study'
])

export function isValidProfessorName(name: string): boolean {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed || INVALID_NAMES.has(trimmed)) return false
  if (/^\d/.test(trimmed)) return false
  if (/^[A-Z]{2,5}\s+\d/.test(name.trim())) return false
  return /[a-zA-Z]{2,}/.test(trimmed)
}

export function parseScheduleBuilderName(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^([A-Za-z'-]+),\s*([A-Za-z'-]+(?:\s+[A-Za-z'-]+)?)$/)
  if (!match) return null

  const name = `${match[1]}, ${match[2]}`
  return isValidProfessorName(name) ? name : null
}

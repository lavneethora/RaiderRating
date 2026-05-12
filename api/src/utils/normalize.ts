const TITLE_PREFIXES = /^(dr|prof|professor|mr|mrs|ms|mx)\.?\s+/i

export function normalizeName(name: string): { firstName: string; lastName: string } {
  let cleaned = name.trim().replace(TITLE_PREFIXES, '')

  if (cleaned.includes(',')) {
    const [last, first] = cleaned.split(',').map(s => s.trim())
    return { firstName: first || '', lastName: last || '' }
  }

  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] }
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1]
  }
}

export function buildCacheKey(name: string): string {
  const { firstName, lastName } = normalizeName(name)
  return `prof:ttu:${lastName.toLowerCase()}:${firstName.toLowerCase()}`
}

export function isValidProfessorName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false

  const invalid = ['tba', 'staff', 'to be announced', 'n/a', '']
  if (invalid.includes(trimmed.toLowerCase())) return false

  if (/^\d/.test(trimmed)) return false

  return /[a-zA-Z]{2,}/.test(trimmed)
}

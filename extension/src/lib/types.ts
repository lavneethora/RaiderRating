export interface ProfessorRating {
  name: string
  firstName: string
  lastName: string
  department: string
  avgRating: number
  avgDifficulty: number
  wouldTakeAgainPercent: number
  numRatings: number
  rmpUrl: string
}

export interface LookupResult {
  found: boolean
  professor: ProfessorRating | null
  cached: boolean
}

export interface BatchLookupResponse {
  results: Record<string, LookupResult>
}

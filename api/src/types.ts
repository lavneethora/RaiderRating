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

export interface BatchLookupRequest {
  names: string[]
  school?: string
}

export interface BatchLookupResponse {
  results: Record<string, LookupResult>
}

export interface RMPTeacherNode {
  id: string
  legacyId: number
  firstName: string
  lastName: string
  department: string
  school: {
    id: string
    name: string
  }
  avgRating: number
  avgDifficulty: number
  numRatings: number
  wouldTakeAgainPercent: number
}

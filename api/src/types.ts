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

export interface GradeCounts {
  A: number
  B: number
  C: number
  D: number
  F: number
  I: number
  CR: number
  P: number
  NC: number
  PR: number
  W: number
  O: number
}

export interface GradeSemester extends GradeCounts {
  semester: string
  total: number
}

export interface GradeEntry {
  instructor: string
  course: string
  overall: GradeCounts
  bySemester: GradeSemester[]
}

export interface GradeLookupResult {
  found: boolean
  entry: GradeEntry | null
}

export interface GradeBatchRequestItem {
  professor: string
  course: string
}

export interface GradeBatchRequest {
  requests: GradeBatchRequestItem[]
}

export interface GradeBatchResponse {
  results: Record<string, GradeLookupResult>
}

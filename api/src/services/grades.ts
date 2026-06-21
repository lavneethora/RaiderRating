import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeName, isValidProfessorName } from '../utils/normalize'
import type { GradeEntry } from '../types'

function findGradesFile(): string {
  const candidates = [
    resolve(__dirname, '../../data/grades.json'),       // dev: src/services -> api/data
    resolve(__dirname, '../../../data/grades.json'),    // prod: dist/services -> api/data
    resolve(process.cwd(), 'data/grades.json'),         // fallback: cwd-relative
  ]
  for (const p of candidates) if (existsSync(p)) return p
  throw new Error(`grades.json not found. Tried: ${candidates.join(', ')}`)
}

const grades: Record<string, GradeEntry> = JSON.parse(
  readFileSync(findGradesFile(), 'utf-8')
)
const gradeMap = new Map<string, GradeEntry>(Object.entries(grades))

console.log(`[grades] Loaded ${gradeMap.size} (professor, course) entries`)

const COURSE_REGEX = /^\s*([A-Za-z]{2,5})\s*(\d{4,5})\s*$/

export function parseCourseCode(raw: string): { subject: string; number: string } | null {
  const m = raw.match(COURSE_REGEX)
  if (!m) return null
  return { subject: m[1].toUpperCase(), number: m[2] }
}

export function buildGradeKey(lastName: string, subject: string, number: string): string {
  return `${lastName.toLowerCase().trim()}:${subject.toLowerCase()}${number}`
}

export function lookupGrades(rawProfessor: string, rawCourse: string): GradeEntry | null {
  if (!isValidProfessorName(rawProfessor)) return null
  const parsedCourse = parseCourseCode(rawCourse)
  if (!parsedCourse) return null

  const { lastName } = normalizeName(rawProfessor)
  if (!lastName) return null

  const key = buildGradeKey(lastName, parsedCourse.subject, parsedCourse.number)
  return gradeMap.get(key) ?? null
}

export function getGradesStats(): { entries: number } {
  return { entries: gradeMap.size }
}

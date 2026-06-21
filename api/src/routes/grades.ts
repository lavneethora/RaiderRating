import { Router } from 'express'
import { z } from 'zod/v4'
import { lookupGrades } from '../services/grades'
import type { GradeLookupResult, GradeBatchResponse } from '../types'

const router = Router()

const lookupSchema = z.object({
  professor: z.string().min(1).max(100),
  course: z.string().min(1).max(20),
})

const batchSchema = z.object({
  requests: z
    .array(
      z.object({
        professor: z.string().min(1).max(100),
        course: z.string().min(1).max(20),
      })
    )
    .min(1)
    .max(20),
})

function lookup(professor: string, course: string): GradeLookupResult {
  const entry = lookupGrades(professor, course)
  return { found: entry !== null, entry }
}

router.get('/lookup', (req, res) => {
  const parsed = lookupSchema.safeParse({
    professor: req.query.professor,
    course: req.query.course,
  })
  if (!parsed.success) {
    res.status(400).json({
      error: 'Missing or invalid query parameters. Required: professor, course',
    })
    return
  }
  res.json(lookup(parsed.data.professor, parsed.data.course))
})

router.post('/batch', (req, res) => {
  const parsed = batchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request body. Expected { requests: [{ professor, course }, ...] }',
    })
    return
  }

  const results: Record<string, GradeLookupResult> = {}
  for (const { professor, course } of parsed.data.requests) {
    const key = `${professor}|${course}`
    if (key in results) continue
    results[key] = lookup(professor, course)
  }

  const response: GradeBatchResponse = { results }
  res.json(response)
})

export default router

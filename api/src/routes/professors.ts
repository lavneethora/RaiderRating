import { Router } from 'express'
import { z } from 'zod/v4'
import { searchProfessor } from '../services/rmp'
import { getFromCache, setInCache } from '../services/cache'
import { normalizeName, buildCacheKey, isValidProfessorName } from '../utils/normalize'
import type { LookupResult, BatchLookupResponse } from '../types'

const router = Router()

const lookupSchema = z.object({
  name: z.string().min(1).max(100),
})

const batchSchema = z.object({
  names: z.array(z.string().min(1).max(100)).min(1).max(20),
})

async function lookupProfessor(rawName: string): Promise<LookupResult> {
  if (!isValidProfessorName(rawName)) {
    return { found: false, professor: null, cached: false }
  }

  const cacheKey = buildCacheKey(rawName)
  const cached = getFromCache(cacheKey)

  if (cached !== undefined) {
    return { found: cached !== null, professor: cached, cached: true }
  }

  const { firstName, lastName } = normalizeName(rawName)

  try {
    const professor = await searchProfessor(firstName, lastName)
    setInCache(cacheKey, professor)
    return { found: professor !== null, professor, cached: false }
  } catch (err) {
    console.error(`RMP lookup failed for "${rawName}":`, err)
    return { found: false, professor: null, cached: false }
  }
}

router.get('/lookup', async (req, res) => {
  const parsed = lookupSchema.safeParse({ name: req.query.name })
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing or invalid "name" query parameter' })
    return
  }

  const result = await lookupProfessor(parsed.data.name)
  res.json(result)
})

router.post('/batch', async (req, res) => {
  const parsed = batchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body. Expected { names: string[] }' })
    return
  }

  const uniqueNames = [...new Set(parsed.data.names)]
  const results: Record<string, LookupResult> = {}

  const CONCURRENCY = 5
  for (let i = 0; i < uniqueNames.length; i += CONCURRENCY) {
    const chunk = uniqueNames.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (name) => {
        results[name] = await lookupProfessor(name)
      })
    )
  }

  const response: BatchLookupResponse = { results }
  res.json(response)
})

export default router

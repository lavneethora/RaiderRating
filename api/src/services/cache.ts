import type { ProfessorRating } from '../types'

interface CacheEntry {
  data: ProfessorRating | null
  timestamp: number
  ttl: number
}

const FOUND_TTL = 24 * 60 * 60 * 1000
const NOT_FOUND_TTL = 6 * 60 * 60 * 1000
const MAX_CACHE_SIZE = 5000

const cache = new Map<string, CacheEntry>()

export function getFromCache(key: string): ProfessorRating | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined

  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return undefined
  }

  return entry.data
}

export function setInCache(key: string, data: ProfessorRating | null): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: data ? FOUND_TTL : NOT_FOUND_TTL,
  })
}

export function clearCache(): void {
  cache.clear()
}

export function getCacheStats(): { size: number; keys: string[] } {
  return { size: cache.size, keys: Array.from(cache.keys()) }
}

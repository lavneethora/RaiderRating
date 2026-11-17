import 'dotenv/config'
import { timingSafeEqual } from 'node:crypto'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { requestLogger } from './utils/logger'
import { clientKey } from './utils/clientKey'
import professorRoutes from './routes/professors'
import gradeRoutes from './routes/grades'
import feedbackRoutes from './routes/feedback'
import { clearCache, getCacheStats } from './services/cache'

const app = express()
const port = parseInt(process.env.PORT || '3001', 10)

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: '10kb' }))
app.use(requestLogger)

// Campus wifi puts many students behind one public address, so this cap is shared
// across all of them during registration rush.
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
}))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/professors', professorRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/feedback', feedbackRoutes)

// Far tighter than the global cap, which is sized for shared campus addresses
// and would otherwise leave room to guess the key.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
})

function matchesAdminKey(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function requireAdminKey(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const key = process.env.ADMIN_API_KEY
  if (!key) { res.status(403).json({ error: 'Admin endpoints disabled' }); return }
  const provided = req.headers['x-admin-key']
  if (typeof provided !== 'string' || !matchesAdminKey(provided, key)) {
    res.status(401).json({ error: 'Invalid admin key' }); return
  }
  next()
}

app.post('/api/cache/clear', adminLimiter, requireAdminKey, (_req, res) => {
  clearCache()
  res.json({ cleared: true })
})

app.get('/api/cache/stats', adminLimiter, requireAdminKey, (_req, res) => {
  res.json(getCacheStats())
})

app.listen(port, () => {
  console.log(`RaiderRating API running on http://localhost:${port}`)
})

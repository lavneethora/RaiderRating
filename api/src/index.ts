import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { requestLogger } from './utils/logger'
import professorRoutes from './routes/professors'
import { clearCache, getCacheStats } from './services/cache'

const app = express()
const port = parseInt(process.env.PORT || '3001', 10)

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: '10kb' }))
app.use(requestLogger)

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/professors', professorRoutes)

function requireAdminKey(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const key = process.env.ADMIN_API_KEY
  if (!key) { res.status(403).json({ error: 'Admin endpoints disabled' }); return }
  if (req.headers['x-admin-key'] !== key) { res.status(401).json({ error: 'Invalid admin key' }); return }
  next()
}

app.post('/api/cache/clear', requireAdminKey, (_req, res) => {
  clearCache()
  res.json({ cleared: true })
})

app.get('/api/cache/stats', requireAdminKey, (_req, res) => {
  res.json(getCacheStats())
})

app.listen(port, () => {
  console.log(`ProfLens API running on http://localhost:${port}`)
})

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod/v4'
import { sendFeedbackEmail } from '../services/feedback'

const router = Router()

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions. Please try again later.' },
})

const feedbackSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  email: z.email(),
})

router.post('/', feedbackLimiter, async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid input. Required: subject (1-200 chars), message (1-2000 chars), email (valid email).',
    })
    return
  }

  try {
    await sendFeedbackEmail(parsed.data.subject, parsed.data.message, parsed.data.email)
    res.json({ success: true })
  } catch (err) {
    console.error('[feedback] Failed to send:', err)
    res.status(500).json({ error: 'Failed to send feedback. Please try again.' })
  }
})

export default router

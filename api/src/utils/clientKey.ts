import type { Request } from 'express'
import { isIP } from 'node:net'
import { ipKeyGenerator } from 'express-rate-limit'

// req.ip is Railway's edge proxy, which rotates per request, so limits keyed on it count nobody.
// Railway's edge sets X-Real-IP to the visitor and overwrites any copy the caller sends.
// Validated anyway: private networking skips the edge, and an unchecked header would be an
// attacker-chosen limiter key.
export function clientKey(req: Request): string {
  const header = req.headers['x-real-ip']
  const candidate = typeof header === 'string' ? header.trim() : ''
  const ip = isIP(candidate) ? candidate : (req.ip ?? '')
  return ipKeyGenerator(ip)
}

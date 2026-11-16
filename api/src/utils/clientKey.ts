import type { Request } from 'express'
import { ipKeyGenerator } from 'express-rate-limit'

// Railway's edge sets X-Real-IP to the visitor's address and replaces any copy the caller sends.
// req.ip is the edge proxy's own address, which changes between requests.
export function clientKey(req: Request): string {
  const realIp = req.headers['x-real-ip']
  const ip = typeof realIp === 'string' && realIp ? realIp : (req.ip ?? '')
  return ipKeyGenerator(ip)
}

import type { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now()
  const originalEnd = _res.end.bind(_res)

  _res.end = function (...args: Parameters<typeof originalEnd>) {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} ${_res.statusCode} ${duration}ms`)
    return originalEnd(...args)
  } as typeof _res.end

  next()
}

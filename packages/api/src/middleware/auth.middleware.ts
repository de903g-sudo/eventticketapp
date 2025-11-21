// path: packages/api/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../utils/jwt'

export interface AuthRequest extends Request {
  auth?: {
    id: string
    role: string
    type?: string
    iat?: number
    exp?: number
  }
}

export function requireAuth(allowedRoles: string[] = []) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization
      if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' })

      const token = header.replace('Bearer ', '')
      const payload = verifyJwt<any>(token)

      if (!payload || !payload.id) return res.status(401).json({ error: 'invalid_token' })

      if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'forbidden' })
      }

      req.auth = payload
      return next()
    } catch (err) {
      console.error('requireAuth error', err)
      return res.status(401).json({ error: 'invalid_token' })
    }
  }
}

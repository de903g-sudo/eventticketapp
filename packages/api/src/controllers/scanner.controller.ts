// path: packages/api/src/controllers/scanner.controller.ts
import { Request, Response } from 'express'
import { supabase } from '../utils/supabase'
import { compareHash } from '../utils/hash'
import { signJwt } from '../utils/jwt'

/**
 * POST /api/scanner/login
 * body: { phone, pin }
 */
export async function scannerLoginHandler(req: Request, res: Response) {
  try {
    const { phone, pin } = req.body
    if (!phone || !pin) return res.status(400).json({ error: 'phone and pin required' })

    // enforce 4-digit PIN
    if (!/^[0-9]{4}$/.test(pin)) {
      return res.status(400).json({ error: 'pin must be exactly 4 digits' })
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, role, name, phone, pin_hash')
      .eq('phone', phone)
      .limit(1)
      .single()

    if (error || !data) return res.status(401).json({ error: 'invalid credentials' })

    const user = data as any

    if (user.role !== 'scanner') {
      return res.status(403).json({ error: 'account not a scanner' })
    }

    const ok = await compareHash(pin, user.pin_hash)
    if (!ok) return res.status(401).json({ error: 'invalid credentials' })

    const token = signJwt({ id: user.id, role: user.role, type: 'scanner' })

    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        phone: user.phone
      }
    })
  } catch (err) {
    console.error('scanner.login error', err)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}
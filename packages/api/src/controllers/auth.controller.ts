// packages/api/src/controllers/auth.controller.ts

import { Request, Response } from "express"
import { supabase } from "../utils/supabase"
import { compareHash } from "../utils/hash"
import { signJwt } from "../utils/jwt"

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" })
    }

    console.log("LOGIN DEBUG: Attempting login for email =", email)

    // =============================
    // FETCH USER FROM DATABASE
    // =============================
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1)
      .single()

    console.log("LOGIN DEBUG: supabase data =", data)
    console.log("LOGIN DEBUG: supabase error =", error)

    if (error || !data) {
      return res.status(401).json({ error: "invalid credentials" })
    }

    const user: any = data

    // If scanner tried to login here
    if (user.role === "scanner") {
      return res.status(403).json({ error: "use scanner login endpoint" })
    }

    // =============================
    // DEBUG: PASSWORD HASH CHECK
    // =============================
    console.log("LOGIN DEBUG: incoming password =", password)
    console.log("LOGIN DEBUG: stored password_hash =", user.password_hash)

    const passwordMatch = await compareHash(password, user.password_hash)

    console.log("LOGIN DEBUG: bcrypt compare =", passwordMatch)

    if (!passwordMatch) {
      return res.status(401).json({ error: "invalid credentials" })
    }

    // Generate JWT
    const token = signJwt({
      id: user.id,
      role: user.role,
      type: "staff"
    })

    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    })
  } catch (err) {
    console.error("auth.login error", err)
    return res.status(500).json({ error: "internal_server_error" })
  }
}

export async function logoutHandler(req: Request, res: Response) {
  return res.json({ ok: true })
}
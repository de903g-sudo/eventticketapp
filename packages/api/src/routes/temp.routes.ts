import express from "express"
import { hashPassword } from "../utils/hash"

const router = express.Router()

router.post("/generate-hash", async (req, res) => {
  const { password } = req.body
  const hash = await hashPassword(password)
  return res.json({ password, hash })
})

export default router
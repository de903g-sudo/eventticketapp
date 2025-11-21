// path: packages/api/src/routes/scanner.routes.ts
import express from 'express'
import { scannerLoginHandler } from '../controllers/scanner.controller'

const router = express.Router()

router.post('/login', scannerLoginHandler)

export default router

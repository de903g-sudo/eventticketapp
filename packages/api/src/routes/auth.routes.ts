// path: packages/api/src/routes/auth.routes.ts
import express from 'express'
import { loginHandler, logoutHandler } from '../controllers/auth.controller'

const router = express.Router()

router.post('/login', loginHandler)
router.post('/logout', logoutHandler)

export default router

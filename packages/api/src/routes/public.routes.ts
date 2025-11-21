import express from "express"
import { getEventBySlugHandler } from "../controllers/public.controller"

const router = express.Router()

router.get("/events/:slug", getEventBySlugHandler)

export default router
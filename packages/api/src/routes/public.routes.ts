import express from "express"
import { getEventBySlugHandler } from "../controllers/public.controller"
import { createOrderHandler } from "../controllers/public.controller"

const router = express.Router()

router.get("/events/:slug", getEventBySlugHandler)
router.post("/events/:eventId/create-order", createOrderHandler)
export default router
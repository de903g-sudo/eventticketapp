import express from "express"
import { requireAuth } from "../middleware/auth.middleware"
import {
  getEventsHandler,
  createEventHandler,
  createTicketTypeHandler
} from "../controllers/organizer.controller"

const router = express.Router()

// Get all events for logged-in organizer
router.get(
  "/events",
  requireAuth(["organizer", "admin"]),
  getEventsHandler
)

// Create new event
router.post(
  "/events",
  requireAuth(["organizer", "admin"]),
  createEventHandler
)

// Create ticket types for specific event
router.post(
  "/events/:id/ticket-types",
  requireAuth(["organizer", "admin"]),
  createTicketTypeHandler
)

export default router

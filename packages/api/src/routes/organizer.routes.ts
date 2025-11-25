import express from "express";
import { createEventHandler, createOrganizerProfile } from "../controllers/organizer.controller";
import { createTicketTypeHandler } from "../controllers/ticketType.controller";

const router = express.Router();

router.post("/profile", createOrganizerProfile);
router.post("/events", createEventHandler);
router.post("/events/:event_id/ticket-types", createTicketTypeHandler);

export default router;

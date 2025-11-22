import express from "express";
import { createEventHandler } from "../controllers/organizer.controller";
import { createTicketTypeHandler } from "../controllers/ticketType.controller";

const router = express.Router();

// Create event
router.post("/events/create", createEventHandler);

// Create ticket type
router.post("/ticket-types/create", createTicketTypeHandler);

export default router;
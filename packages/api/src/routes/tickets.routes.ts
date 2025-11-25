import { Router } from "express";
import { getTicketPdf, regenerateTicketPdf } from "../controllers/tickets.controller";

const router = Router();

// existing routes...
router.get("/:ticket_id/pdf", getTicketPdf);          // returns signed URL (or pdf_url)
router.post("/:ticket_id/pdf/regenerate", regenerateTicketPdf); // force rebuild and upload

export default router;
// packages/api/src/routes/ticketsPdfRoutes.ts
import express from "express";
import { generateticketPDF } from "../services/tickets/pdfService";
const router = express.Router();

// GET signed URL (generate if not present)
router.get("/:ticket_id/pdf", async (req, res) => {
  try {
    const ticketId = req.params.ticket_id;
    const signedUrl = await generateticketPDF(ticketId, { force: false });
    res.json({ url: signedUrl });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate PDF" });
  }
});

// Regenerate (force)
router.post("/:ticket_id/pdf/regenerate", async (req, res) => {
  try {
    const ticketId = req.params.ticket_id;
    const signedUrl = await generateticketPDF(ticketId, { force: true });
    res.json({ url: signedUrl });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to regenerate PDF" });
  }
});

export default router;

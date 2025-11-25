import { Request, Response } from "express";
import { supabase } from "../utils/supabase"; // adjust path if needed
import { generateTicketPDF } from "../services/tickets/pdfService";

/**
 * GET /api/tickets/:ticket_id/pdf
 * If pdf_url exists on ticket row return it; otherwise generate and return.
 */
export async function getTicketPdf(req: Request, res: Response) {
  try {
    const ticketId = req.params.ticket_id;
    // Accept unique_code or id
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .or(`id.eq.${ticketId},unique_code.eq.${ticketId}`)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // If already has pdf_url, return it
    if (ticket.pdf_url) {
      return res.json({ pdf_url: ticket.pdf_url });
    }

    // Otherwise generate PDF and upload (pdfService returns publicUrl)
    const { publicUrl } = await generateTicketPDF(ticket, {
      name: req.query.event_name || null // optional event details
    });

    return res.json({ pdf_url: publicUrl });
  } catch (err: any) {
    console.error("getTicketPdf:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}

/**
 * POST /api/tickets/:ticket_id/pdf/regenerate
 * Force regenerate the PDF (useful if branding or QR updated).
 * Auth: organizer/admin (you should add middleware in real app).
 */
export async function regenerateTicketPdf(req: Request, res: Response) {
  try {
    const ticketId = req.params.ticket_id;
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .or(`id.eq.${ticketId},unique_code.eq.${ticketId}`)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const { publicUrl } = await generateTicketPDF(ticket, {
      name: req.body.event_name || null
    });

    return res.json({ pdf_url: publicUrl });
  } catch (err: any) {
    console.error("regenerateTicketPdf:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
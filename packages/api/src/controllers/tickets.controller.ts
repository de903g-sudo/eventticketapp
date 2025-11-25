import { Request, Response } from "express";
import { supabase } from "../utils/supabase"; // adjust path if needed
import { generateticketPDF } from "../services/tickets/pdfService";

export async function getTicketPdf(req: Request, res: Response) {
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

    // If already has pdf_url, return it
    if (ticket.pdf_url) {
      return res.json({ pdf_url: ticket.pdf_url });
    }

    // Generate PDF: NO extra metadata
    const pdfUrl = await generateticketPDF(ticket.id);

    return res.json({ pdf_url: pdfUrl });
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

    // Force regeneration – NO metadata
    const pdfUrl = await generateticketPDF(ticket.id, { force: true });

    return res.json({ pdf_url: pdfUrl });
  } catch (err: any) {
    console.error("regenerateTicketPdf:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}

export async function getMyTickets(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    // 1) Find the user with this email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.json({ tickets: [] });
    }

    const customerId = user.id;

    // 2) Find orders linked to this user
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", customerId);

    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }

    if (!orders || orders.length === 0) {
      return res.json({ tickets: [] });
    }

    const orderIds = orders.map((o) => o.id);

    // 3) Fetch all tickets for these orders
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (ticketsError) {
      return res.status(500).json({ error: ticketsError.message });
    }

    return res.json({ tickets });
  } catch (err: any) {
    console.error("getMyTickets error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}

export async function getSingleTicket(req: Request, res: Response) {
  try {
    const uniqueCode = req.params.unique_code;

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("unique_code", uniqueCode)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.json({ ticket });
  } catch (err: any) {
    console.error("getSingleTicket:", err);
    return res.status(500).json({ error: err.message });
  }
}
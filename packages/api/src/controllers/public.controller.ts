import { Request, Response } from "express"
import { supabase } from "../utils/supabase"

// ===================================================
// GET /api/events/:slug
// Public event details + ticket types
// ===================================================
export async function getEventBySlugHandler(req: Request, res: Response) {
  try {
    const slug = req.params.slug

    // STEP 1 — Fetch event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .single()

    if (eventError || !event) {
      return res.status(404).json({ error: "event_not_found" })
    }

    // STEP 2 — Fetch its ticket types (only active)
    const { data: ticketTypes, error: ticketError } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_active", true)

    // You don't send error to user; just return empty array if failed
    const tickets = ticketTypes || []

    // STEP 3 — Final payload returned to frontend
    return res.json({
      event,
      tickets
    })
  } catch (err) {
    console.error("getEventBySlug error", err)
    return res.status(500).json({ error: "server_error" })
  }
}
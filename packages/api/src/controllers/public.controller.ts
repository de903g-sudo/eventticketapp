import { supabase } from "../utils/supabase";

// ===============================
// GET EVENT BY SLUG
// ===============================
export const getEventBySlugHandler = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug is required" });
    }

    // Fetch event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Fetch ticket types for the event
    const { data: ticket_types, error: ticketError } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_active", true);

    if (ticketError) {
      return res.status(500).json({ error: ticketError.message });
    }

    return res.json({
      success: true,
      event,
      ticket_types
    });
  } catch (err) {
    console.error("PUBLIC EVENT ERROR:", err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};
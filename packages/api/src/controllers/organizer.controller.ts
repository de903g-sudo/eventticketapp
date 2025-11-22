// path: packages/api/src/controllers/organizer.controller.ts

import { supabase } from "../utils/supabase";

// ======================================================================
// CREATE EVENT
// ======================================================================
export const createEventHandler = async (req, res) => {
  try {
    const { organizer_id, name, description, event_date, venue, banner_url } = req.body;

    if (!organizer_id || !name || !event_date || !venue) {
      return res.status(400).json({ 
        error: "Missing required fields" 
      });
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        organizer_id,
        name,
        description,
        event_date,
        venue,
        banner_url,
      })
      .select()
      .single();

    if (error) {
      console.error("EVENT CREATE ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      event: data,
    });

  } catch (err) {
    console.error("EVENT CREATE CATCH ERROR:", err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};


// ======================================================================
// GET ALL EVENTS FOR AN ORGANIZER (Optional but useful)
// ======================================================================
export const getOrganizerEventsHandler = async (req, res) => {
  try {
    const { organizer_id } = req.params;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", organizer_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      events: data,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};
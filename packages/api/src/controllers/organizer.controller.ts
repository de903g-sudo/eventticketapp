// path: packages/api/src/controllers/organizer.controller.ts

import { supabase } from "../utils/supabase";

export const createOrganizerProfile = async (req, res) => {
  try {
    const {
      user_id,
      company_name,
      gstin,
      address,
      contact_email,
      contact_phone,
    } = req.body;

    if (!user_id || !company_name || !gstin || !address || !contact_email || !contact_phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("organizers")
      .insert([
        {
          user_id,
          company_name,
          gstin,
          address,
          contact_email,
          contact_phone,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      organizer: data,
    });
  } catch (err) {
    return res.status(500).json({ error: "internal_server_error" });
  }
};


// ======================================================================
// CREATE EVENT
// ======================================================================

export const createEventHandler = async (req, res) => {
  try {
    const {
      organizer_id,
      name,
      slug,
      description,
      venue_name,
      venue_address,
      city,
      state,
      start_datetime,
      end_datetime,
      status,
      banner_image_url,
      timezone
    } = req.body;

    if (
      !organizer_id ||
      !name ||
      !slug ||
      !venue_name ||
      !venue_address ||
      !city ||
      !state ||
      !start_datetime ||
      !end_datetime
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          organizer_id,
          name,
          slug,
          description,
          venue_name,
          venue_address,
          city,
          state,
          start_datetime,
          end_datetime,
          status: status || "draft",
          banner_image_url: banner_image_url || null,
          timezone: timezone || "Asia/Kolkata"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("EVENT CREATE ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      success: true,
      event: data
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
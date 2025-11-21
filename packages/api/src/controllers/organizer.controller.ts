// packages/api/src/controllers/organizer.controller.ts

import { Request, Response } from "express"
import { supabase } from "../utils/supabase"
import { AuthRequest } from "../middleware/auth.middleware"

// ======================================================
// Utility: Fetch organizer profile for logged-in user
// ======================================================
async function getOrganizerForUser(userId: string) {
  const { data, error } = await supabase
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .single()

  return { organizer: data, error }
}

// ======================================================
// 1. GET ALL EVENTS FOR ORGANIZER
// ======================================================
export async function getEventsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.auth?.id

    // Lookup organizer profile
    const { organizer, error: organizerError } = await getOrganizerForUser(userId!)
    if (organizerError || !organizer) {
      return res.status(400).json({ error: "organizer_profile_missing" })
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", organizer.id)

    if (error) {
      console.log("EVENT FETCH ERROR:", error)
      return res.status(500).json({ error: "failed_to_fetch_events" })
    }

    return res.json({ events: data })
  } catch (err) {
    console.error("getEvents error", err)
    return res.status(500).json({ error: "server_error" })
  }
}

// ======================================================
// 2. CREATE EVENT
// ======================================================
export async function createEventHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.auth?.id

    // STEP 1 — find organizer profile for logged-in user
    const { organizer, error: organizerError } = await getOrganizerForUser(userId!)
    if (organizerError || !organizer) {
      return res.status(400).json({ error: "organizer_profile_missing" })
    }

    const {
      name,
      slug,
      description,
      venue_name,
      venue_address,
      city,
      state,
      start_datetime,
      end_datetime,
      banner_image_url,
      timezone
    } = req.body

    // STEP 2 — insert event using organizer.id (not user id)
    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          organizer_id: organizer.id,
          name,
          slug,
          description,
          venue_name,
          venue_address,
          city,
          state,
          start_datetime,
          end_datetime,
          banner_image_url,
          timezone,
          status: "draft"
        }
      ])
      .select()

    if (error) {
      console.log("EVENT CREATE ERROR:", error)
      return res.status(500).json({ error: "failed_to_create_event" })
    }

    return res.json({ event: data[0] })
  } catch (err) {
    console.error("createEvent error", err)
    return res.status(500).json({ error: "server_error" })
  }
}

// ======================================================
// 3. CREATE TICKET TYPE FOR EVENT
// ======================================================
export async function createTicketTypeHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.auth?.id
    const eventId = req.params.id

    // STEP 1 — verify organizer profile
    const { organizer, error: organizerError } = await getOrganizerForUser(userId!)
    if (organizerError || !organizer) {
      return res.status(400).json({ error: "organizer_profile_missing" })
    }

    // STEP 2 — verify event belongs to organizer
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", eventId)
      .single()

    if (eventError || !event || event.organizer_id !== organizer.id) {
      return res.status(403).json({ error: "unauthorized_event_access" })
    }

    // STEP 3 — extract ticket fields
    const {
      name,
      base_price,
      currency,
      gst_rate,
      hsn_sac_code,
      total_quantity,
      max_per_order,
      entry_type,
      sale_start_datetime,
      sale_end_datetime
    } = req.body

    // STEP 4 — insert ticket type
    const { data, error } = await supabase
      .from("ticket_types")
      .insert([
        {
          event_id: eventId,
          name,
          base_price,
          currency,
          gst_rate,
          hsn_sac_code,
          total_quantity,
          max_per_order,
          entry_type,
          sale_start_datetime,
          sale_end_datetime,
          is_active: true
        }
      ])
      .select()

    if (error) {
      console.log("TICKET TYPE CREATE ERROR:", error)
      return res.status(500).json({ error: "failed_to_create_ticket_type" })
    }

    return res.json({ ticket_type: data[0] })
  } catch (err) {
    console.error("createTicketType error", err)
    return res.status(500).json({ error: "server_error" })
  }
}
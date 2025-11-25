import { Request, Response } from "express";
import { supabase } from "../utils/supabase";

export const createTicketTypeHandler = async (req, res) => {
  try {
    const { event_id } = req.params;

    const {
      name,
      base_price,
      gst_rate,
      hsn_sac_code,
      total_quantity,
      max_per_order,
      entry_type,
      sale_start_datetime,
      sale_end_datetime,
      is_active
    } = req.body;

    // Validate required fields
    if (
      !event_id ||
      !name ||
      base_price === undefined ||
      gst_rate === undefined ||
      !hsn_sac_code ||
      !total_quantity ||
      !entry_type ||
      !sale_start_datetime ||
      !sale_end_datetime
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("ticket_types")
      .insert([
        {
          event_id,
          name,
          base_price,
          gst_rate,
          hsn_sac_code,
          total_quantity,
          max_per_order: max_per_order || null,
          entry_type,
          sale_start_datetime,
          sale_end_datetime,
          is_active: is_active ?? true,
        }
      ])
      .select()
      .single();

    if (error)
      return res.status(400).json({ error: error.message });

    return res.status(201).json({
      success: true,
      ticket_type: data,
    });

  } catch (err) {
    console.error("TICKET TYPE ERROR:", err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};
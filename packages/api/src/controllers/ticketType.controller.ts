import { Request, Response } from "express";
import { supabase } from "../utils/supabase";

export const createTicketTypeHandler = async (req: Request, res: Response) => {
    try {
        const { event_id, name, price, gst_rate, max_entries } = req.body;

        if (!event_id || !name || !price) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from("ticket_types")
            .insert({
                event_id,
                name,
                price,
                gst_rate,
                max_entries,
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({
            success: true,
            ticket_type: data
        });

    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
};
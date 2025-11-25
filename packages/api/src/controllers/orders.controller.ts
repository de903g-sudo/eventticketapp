import { supabase } from "../utils/supabase";

// Create Order Handler
export const createOrderHandler = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { customer_id, tickets } = req.body;

    if (!event_id || !customer_id || !tickets || !Array.isArray(tickets)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Fetch ticket types
    const ticketTypeIds = tickets.map((t) => t.ticket_type_id);

    const { data: dbTicketTypes, error: ticketError } = await supabase
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds);

    if (ticketError) {
      return res.status(500).json({ error: ticketError.message });
    }

    // Calculate totals
    let total_base = 0;
    let total_gst = 0;
    let total_amount = 0;

    for (const item of tickets) {
      const tt = dbTicketTypes.find((t) => t.id === item.ticket_type_id);

      if (!tt) {
        return res.status(400).json({ error: "Invalid ticket_type_id" });
      }

      const qty = item.quantity;
      const base = tt.base_price * qty;
      const gst = (tt.base_price * tt.gst_rate / 100) * qty;
      const total = base + gst;

      total_base += base;
      total_gst += gst;
      total_amount += total;
    }

    // Create order
    const order_number = `ORD-${Date.now()}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          order_number,
          customer_id,
          event_id,
          status: "pending_payment",
          total_base_amount: total_base,
          total_gst_amount: total_gst,
          total_amount,
          payment_gateway: "mock",
        },
      ])
      .select()
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    // Insert order items
    for (const item of tickets) {
      const tt = dbTicketTypes.find((t) => t.id === item.ticket_type_id);

      const qty = item.quantity;
      const unit_base = tt.base_price;
      const unit_gst = tt.base_price * (tt.gst_rate / 100);
      const unit_total = unit_base + unit_gst;

      await supabase.from("order_items").insert([
        {
          order_id: order.id,
          ticket_type_id: tt.id,
          quantity: qty,
          unit_base,
          unit_gst,
          unit_total,
          line_base_total: unit_base * qty,
          line_gst_total: unit_gst * qty,
          line_total: unit_total * qty,
        },
      ]);
    }

    return res.json({
      success: true,
      order_id: order.id,
      order_number,
      total_amount,
    });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};
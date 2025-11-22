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

// ===================================================
// POST /api/events/:eventId/create-order
// Create pending order before payment
// ===================================================
export async function createOrderHandler(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId
    const { items, buyer_name, buyer_email, buyer_phone } = req.body

    // Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "no_items" })
    }

    // STEP 1: Validate event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return res.status(404).json({ error: "event_not_found" })
    }

    // STEP 2: Fetch selected ticket types
    const ticketTypeIds = items.map((i: any) => i.ticket_type_id)

    const { data: ticketTypes, error: ticketErr } = await supabase
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)

    if (ticketErr || !ticketTypes) {
      return res.status(400).json({ error: "invalid_ticket_types" })
    }

    // STEP 3: Calculate total amount
    let totalAmount = 0
    let orderItems = []

    for (const item of items) {
      const ticketType = ticketTypes.find(t => t.id === item.ticket_type_id)
      if (!ticketType) continue

      const qty = item.quantity
      const base = ticketType.base_price * qty
      const gst = (ticketType.gst_rate / 100) * base
      const lineTotal = base + gst

      orderItems.push({
        ticket_type_id: ticketType.id,
        quantity: qty,
        base_price: ticketType.base_price,
        gst_rate: ticketType.gst_rate,
        line_total: lineTotal
      })

      totalAmount += lineTotal
    }

    // STEP 4: Insert order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([
        {
          event_id: eventId,
          buyer_name,
          buyer_email,
          buyer_phone,
          amount: totalAmount,
          status: "pending_payment"
        }
      ])
      .select()
      .single()

    if (orderErr || !order) {
      console.log("ORDER INSERT ERROR:", orderErr)
      return res.status(500).json({ error: "create_order_failed" })
    }

    // STEP 5: Insert order_items
    const itemsToInsert = orderItems.map(i => ({
      order_id: order.id,
      ticket_type_id: i.ticket_type_id,
      quantity: i.quantity,
      base_price: i.base_price,
      gst_rate: i.gst_rate,
      line_total: i.line_total
    }))

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(itemsToInsert)

    if (itemsErr) {
      console.log("ORDER ITEMS ERROR:", itemsErr)
      return res.status(500).json({ error: "order_items_failed" })
    }

    // RESPONSE (Razorpay integration added in next step)
    return res.json({
      order_id: order.id,
      payable_amount: totalAmount,
      currency: "INR",
      event_id: eventId
    })
  } catch (err) {
    console.error("createOrder error", err)
    return res.status(500).json({ error: "server_error" })
  }
}

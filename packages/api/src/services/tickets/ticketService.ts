// packages/api/src/services/tickets/ticketService.ts

import { supabase } from "../../utils/supabase";
import { generateticketPDF } from "./pdfService";
import QRCode from "qrcode";

/**
 * Generate tickets for a given order.
 * This gets called after payment success.
 */
export async function generateticketsForOrder(orderId: string) {
  // 1. Load order items + event + ticket types
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      ticket_type_id,
      quantity,
      ticket_types (
        id,
        name,
        event_id
      ),
      events:event_id (
        id,
        name,
        venue_name,
        start_datetime,
        organizer_id
      ),
      orders:order_id (
        id,
        customer_id
      )
    `
    )
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;
  if (!items || items.length === 0)
    throw new Error("No order items found for this order.");

  const createdTickets: any[] = [];

  // 2. Loop through each order item and generate N tickets
  for (const item of items) {
    const qty = item.quantity || 1;

    for (let i = 0; i < qty; i++) {
      // 3. Create unique code
      const uniqueCode = `TKT-${item.ticket_type_id}-${Date.now()}-${Math.floor(
        Math.random() * 99999
      )}`;

      // 4. Generate QR code (base64 PNG)
      const qrDataUrl = await QRCode.toDataURL(
        JSON.stringify({
          unique_code: uniqueCode,
          ticket_type_id: item.ticket_type_id,
          order_id: orderId
        }),
        { margin: 1, scale: 5 }
      );

      // 5. Insert ticket row
      const { data: ticketRow, error: ticketErr } = await supabase
        .from("tickets")
        .insert({
          order_id: orderId,
          ticket_type_id: item.ticket_type_id,
          unique_code: uniqueCode,
          qr_code_url: qrDataUrl,
          status: "valid",
          check_in_count: 0
        })
        .select()
        .single();

      if (ticketErr) throw ticketErr;

      createdTickets.push(ticketRow);

      // 6. Generate PDF for this ticket
      try {
        const pdfUrl = await generateticketPDF(ticketRow.id);

        // 7. Save pdf_url back to DB
        await supabase
          .from("tickets")
          .update({ pdf_url: pdfUrl })
          .eq("id", ticketRow.id);
      } catch (err) {
        console.error("PDF generation failed for ticket:", ticketRow.id, err);
        // continue, but ticket exists
      }
    }
  }

  return createdTickets;
}

/**
 * Fetch all tickets for a user (My Tickets API)
 */
export async function getTicketsForUser(email: string) {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userErr) throw userErr;
  if (!user) throw new Error("User not found");

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_id", user.id);

  if (ordersErr) throw ordersErr;

  const orderIds = orders.map((o) => o.id);

  const { data: tickets, error: ticketsErr } = await supabase
    .from("tickets")
    .select(
      `
      id,
      order_id,
      ticket_type_id,
      unique_code,
      qr_code_url,
      pdf_url,
      ticket_types ( name ),
      orders ( event_id ),
      events:event_id ( name, venue_name, start_datetime )
    `
    )
    .in("order_id", orderIds);

  if (ticketsErr) throw ticketsErr;

  return tickets;
}

/**
 * Single ticket lookup (scanner + viewer)
 */
export async function getTicketByCode(uniqueCode: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id,
      unique_code,
      order_id,
      status,
      check_in_count,
      ticket_types ( name ),
      orders ( event_id ),
      events:event_id ( name, venue_name, start_datetime )
    `
    )
    .eq("unique_code", uniqueCode)
    .single();

  if (error) throw error;
  return data;
}

export { generateticketPDF };

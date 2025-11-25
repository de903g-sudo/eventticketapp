import { supabase } from "/Users/danis/eventticketapp/packages/api/src/utils/supabase";
// SAFEST import for your tsconfig (Node16 + CommonJS)
const { v4: uuidv4 } = require("uuid");

import QRCode from "qrcode";
import { generateTicketPDF } from "./pdfService";

/**
 * Generate tickets for a given order.
 * @param order_id string
 */
export async function generateTickets(order_id: string) {
  if (!order_id) {
    throw new Error("ticketService: order_id is undefined");
  }

  // 1. Fetch order items for this order
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order_id);

  if (orderItemsError) {
    throw new Error("Failed to fetch order items: " + orderItemsError.message);
  }

  if (!orderItems || orderItems.length === 0) {
    throw new Error("No order items found for order_id: " + order_id);
  }

  const generatedTickets: any[] = [];

  // Loop through items and create qty number of tickets for each item
  for (const item of orderItems) {
    const qty = item.quantity;

    for (let i = 0; i < qty; i++) {
      const _ticketId = uuidv4();
      const _uniqueCode = uuidv4();

      // 2. Insert ticket into DB
      const { data: created, error: createError } = await supabase
        .from("tickets")
        .insert([
          {
            id: _ticketId,
            order_id: order_id,
            ticket_type_id: item.ticket_type_id,
            unique_code: _uniqueCode,
            status: "valid",
            check_in_count: 0,
            max_entries: 1
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error("[ticketService] Failed to insert ticket:", createError);
        throw new Error("ticket creation failed: " + createError.message);
      }

      // 3. Build QR payload
      const qrPayload = JSON.stringify({
        ticket_id: created.id,
        unique_code: created.unique_code,
        order_id: created.order_id
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, scale: 6 });

      // 4. Save QR code to DB
      await supabase
        .from("tickets")
        .update({
          qr_code_url: qrDataUrl
        })
        .eq("id", created.id);

      // 5. Generate PDF for this ticket (returns publicUrl)
      try {
        const { publicUrl } = await generateTicketPDF(
          {
            ...created,
            qr_code_url: qrDataUrl
          },
          {
            name: item.event_name || "Event",
            venue: item.venue || "",
            start_datetime: item.start_datetime || "",
            organizer_name: item.organizer_name || "",
            ticket_type_name: item.ticket_type_name || "",
            price: item.price || ""
          }
        );

        // 6. Store pdf_url back to DB
        await supabase
          .from("tickets")
          .update({ pdf_url: publicUrl })
          .eq("id", created.id);

        generatedTickets.push({
          ...created,
          pdf_url: publicUrl,
          qr_code_url: qrDataUrl
        });

      } catch (err: any) {
        console.error("PDF generation failed:", err);
        generatedTickets.push({
          ...created,
          pdf_url: null,
          qr_code_url: qrDataUrl,
          pdf_error: err.message
        });
      }
    }
  }

  return {
    success: true,
    order_id,
    tickets: generatedTickets
  };
}
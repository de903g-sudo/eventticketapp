import crypto from "crypto";
import { supabase } from "../../utils/supabase";
import QRCode from "qrcode";
import { generateTicketPDF } from "./pdfGenerator";

export const createTicketsForOrder = async (order) => {
  // 1. Fetch order_items
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  if (itemsError) {
    console.log("ORDER ITEMS ERROR:", itemsError);
    throw new Error("Failed to fetch order items");
  }

  const allTickets = [];

  // 2. Loop through each item
  for (let item of items) {
    for (let i = 0; i < item.quantity; i++) {
      // Generate unique code
      const uniqueCode = crypto.randomUUID();

      // Generate QR Code (base64)
      const qrData = await QRCode.toDataURL(uniqueCode);

      // 3. Insert ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          order_id: order.id,
          ticket_type_id: item.ticket_type_id,

          unique_code: uniqueCode,
          qr_code_url: qrData,

          status: "valid",
          check_in_count: 0,
          max_entries: 1,

          holder_name: "",
          holder_email: "",
          holder_phone: "",
        })
        .select()
        .single();

      if (ticketError || !ticket) {
        console.log("TICKET INSERT ERROR:", ticketError);
        throw new Error("Ticket insert failed");
      }

      // 4. Generate PDF Buffer
      const pdfBuffer = await generateTicketPDF(ticket);

      // 5. Upload PDF to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("tickets")
        .upload(`ticket-${ticket.id}.pdf`, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadErr) {
        console.log("STORAGE UPLOAD ERROR:", uploadErr);
        throw new Error("PDF upload failed");
      }

      // 6. Generate public URL for the PDF
      const { data: publicUrlData } = supabase.storage
        .from("tickets")
        .getPublicUrl(uploadData.path);

      // 7. Save PDF URL to the ticket row
      await supabase
        .from("tickets")
        .update({ pdf_url: publicUrlData.publicUrl })
        .eq("id", ticket.id);

      allTickets.push({
        ...ticket,
        pdf_url: publicUrlData.publicUrl,
      });
    }
  }

  return allTickets;
};
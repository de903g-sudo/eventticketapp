// packages/api/src/services/tickets/pdfService.ts
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { supabase } from "../../utils/supabase"; // your supabase client that uses service role

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

type TicketRow = {
  id: string;
  order_id: string;
  ticket_type_id: string;
  unique_code: string;
  holder_name?: string | null;
  pdf_url?: string | null;
  // add other fields you store
};

type EventRow = {
  id: string;
  name: string;
  venue_name?: string;
  start_datetime?: string;
  organizer_id?: string;
  logo_url?: string | null;
  // ...
};

async function fetchTicketWithRelations(ticket_id: string) {
  // adapt SQL / supabase call to your schema
  const { data, error } = await supabase
    .from("tickets")
    .select(`
      id, unique_code, holder_name, pdf_url, order_id,
      ticket_types:ticket_type_id ( id, name, base_price ),
      events:order_id!inner ( id, name, venue_name, start_datetime, organizer_id )
    `)
    .eq("id", ticket_id)
    .limit(1)
    .single();

  if (error) throw error;
  return data as any;
}

export async function generateticketPDF (ticket_id: string, options?: { force?: boolean, brandColor?: string }) {
  const ticketData = await fetchTicketWithRelations(ticket_id);
  if (!ticketData) throw new Error("Ticket not found");

  // If already has pdf_url and not force, return signed url
  if (ticketData.pdf_url && !options?.force) {
    const { data } = await supabase
      .storage
      .from(process.env.TICKETS_BUCKET as string)
      .createSignedUrl(ticketData.pdf_url, Number(process.env.PDF_EXPIRE_SECONDS ?? 86400));
    return data.signedUrl;
  }

  // Build QR payload: include unique_code and optionally HMAC or ticket id
  const qrPayload = JSON.stringify({
    unique_code: ticketData.unique_code,
    ticket_id: ticketData.id,
    // Add HMAC here if you implement HMAC signing for QR security
  });

  // Generate QR data URL
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, scale: 6 });

  // Create PDF in memory with PDFKit
  const doc = new PDFDocument({
    size: "A6", // compact ticket - change to 'A4' if needed
    margins: { top: 18, left: 18, right: 18, bottom: 18 },
  });

  // Streams the PDF into a buffer
  const stream = doc as unknown as NodeJS.ReadableStream;

  // Layout variables
  const brandColor = options?.brandColor ?? "#111827";
  const pageWidth = doc.page.width;
  const startY = 20;

  // Add organiser logo (if exists)
  if (ticketData.events?.logo_url) {
    try {
      const res = await fetch(ticketData.events.logo_url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        doc.image(Buffer.from(buf), 18, startY, { width: 70, height: 40 });
      }
    } catch (err) {
      // ignore logo fetch failure
    }
  }

  // Event title
  doc
    .fontSize(16)
    .fillColor(brandColor)
    .font("Helvetica-Bold")
    .text(ticketData.events.name || "Event", 18 + 80, startY, { width: pageWidth - 110 });

  // Date & venue
  doc.moveDown(0.6);
  doc
    .fontSize(9)
    .fillColor("#333")
    .font("Helvetica")
    .text(`${ticketData.events.start_datetime ? new Date(ticketData.events.start_datetime).toLocaleString() : ""}`, 18 + 80, doc.y, {
      width: pageWidth - 110,
    });
  if (ticketData.events.venue_name) {
    doc.fontSize(9).text(ticketData.events.venue_name, 18 + 80, doc.y, { width: pageWidth - 110 });
  }

  // Draw a divider
  doc.moveTo(18, 110).lineTo(pageWidth - 18, 110).lineWidth(0.5).strokeColor("#E5E7EB").stroke();

  // Holder name and ticket type
  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#000").text(ticketData.holder_name || "Ticket Holder", 18, 120);
  doc.moveDown(0.2);
  const ticketTypeText = ticketData.ticket_types?.name || "General";
  doc.fontSize(10).font("Helvetica").fillColor("#374151").text(ticketTypeText, 18, doc.y);

  // QR: decode data URL and draw
  const qrImg = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrImg, "base64");
  const qrX = pageWidth - 18 - 110;
  const qrY = 140;
  doc.image(qrBuffer, qrX, qrY, { width: 110, height: 110 });

  // Unique code text (human-readable)
  doc.fontSize(10).font("Helvetica-Mono").fillColor("#000").text(ticketData.unique_code, 18, 200);

  // Footer: terms
  doc
    .fontSize(6.5)
    .fillColor("#6B7280")
    .text(
      "This ticket is non-transferable. Present this QR at the gate. Organizer reserves the right to refuse entry. See event page for T&C.",
      18,
      doc.page.height - 60,
      { width: pageWidth - 36, align: "left" }
    );

  // finalize
  doc.end();

  const buffer = await streamToBuffer(stream);

  // Build filename & path in bucket
  const filename = `ticket_${ticketData.id}_${Date.now()}.pdf`;
  const filePath = `${process.env.PDF_TEMP_PREFIX || "ticket-pdfs/"}${filename}`;

  // Upload to Supabase storage (service role client)
  const uploadRes = await supabase.storage.from(process.env.TICKETS_BUCKET as string).upload(filePath, buffer, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadRes.error) {
    throw uploadRes.error;
  }

  // Create signed URL
  const { data: signedData, error: signedErr } = await supabase.storage
    .from(process.env.TICKETS_BUCKET as string)
    .createSignedUrl(filePath, Number(process.env.PDF_EXPIRE_SECONDS ?? 86400));

  if (signedErr) throw signedErr;

  const signedUrl = signedData.signedUrl;

  // Save pdf_url (store path, not signed URL) to tickets row
  const { error: updateErr } = await supabase
    .from("tickets")
    .update({ pdf_url: filePath })
    .eq("id", ticketData.id);

  if (updateErr) {
    // Log but return URL; decide if you want to rollback
    console.error("Failed to update ticket row with pdf_url", updateErr);
  }

  return signedUrl;
}
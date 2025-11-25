import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { supabase } from "../../utils/supabase";

type TicketRecord = {
  id: string;
  unique_code: string;
  holder_name?: string | null;
  holder_email?: string | null;
  holder_phone?: string | null;
  ticket_type_id?: string | null;
  pdf_url?: string | null;
  status?: string | null;
};

export async function generateTicketPDF(ticket: TicketRecord, eventDetails: any = {}) {
  const doc = new PDFDocument({
    size: "A6",
    margins: { top: 18, left: 18, right: 18, bottom: 18 },
  });

  // Prepare stream to capture PDF buffer
  const stream = doc;

  // ------------  BACKGROUND ------------
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0b1117");

  const brandColor = eventDetails.brandColor ?? "#ff6b6b";
  const white = "#ffffff";
  const muted = "#bfc6cf";

  // ------------  HEADER / TITLE ------------
  doc
    .fill(brandColor)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text((eventDetails.name || "EVENT NAME").toUpperCase(), 24, 28, {
      width: doc.page.width - 140,
      align: "left",
    });

  doc
    .fill(muted)
    .font("Helvetica")
    .fontSize(9)
    .text(
      `${eventDetails.venue || "Venue"} · ${eventDetails.start_datetime || "Date & Time"}`,
      24,
      48,
      { width: doc.page.width - 140 }
    );

  // ------------  QR CODE ------------
  const qrSize = 110;
  const qrX = doc.page.width - qrSize - 24;
  const qrY = 18;

  const qrPayload = JSON.stringify({
    ticket_id: ticket.id,
    unique_code: ticket.unique_code,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, scale: 6 });
  const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(base64, "base64");

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // ------------  TICKET HOLDER DETAILS ------------
  const leftX = 18;
  const leftWidth = doc.page.width - qrSize - 18 - 36;
  const leftY = 88;

  doc
    .fill(white)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(ticket.holder_name || "Guest User", leftX, leftY, {
      width: leftWidth,
    });

  doc
    .moveDown(0.2)
    .font("Helvetica")
    .fontSize(9)
    .fill(muted)
    .text(`Ticket: ${eventDetails.ticket_type_name ?? "General Admission"}`);

  doc.moveDown(0.7);

  doc.fontSize(8).fill(muted);
  doc.text(`Order ID: ${ticket.id}`, leftX);
  doc.text(`Ticket Code: ${ticket.unique_code}`, leftX);
  if (eventDetails.organizer_name) {
    doc.text(`Organizer: ${eventDetails.organizer_name}`, leftX);
  }

  if (eventDetails.price) {
    doc.moveDown(0.4).fontSize(10).fill(white);
    doc.text(`Amount: ${eventDetails.price}`, leftX, doc.y);
    if (eventDetails.gst) {
      doc.fontSize(8).fill(muted).text(`GST: ${eventDetails.gst}%`);
    }
  }

  doc
    .fontSize(7)
    .fill(muted)
    .text(
      eventDetails.terms ||
        "Present this ticket at the gate. Non-transferable · Non-refundable",
      24,
      doc.page.height - 46,
      { width: doc.page.width - 48 }
    );

  doc.end();

  // ------------  CONVERT STREAM → BUFFER (NATIVE) ------------
  const chunks: Buffer[] = [];

  stream.on("data", (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

  // ------------  UPLOAD TO SUPABASE STORAGE ------------
  const filePath = `tickets/${ticket.unique_code}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("tickets")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error("Failed to upload PDF: " + uploadError.message);
  }

  // ------------  CREATE SIGNED URL ------------
  const { data: urlData, error: urlError } = await supabase.storage
    .from("tickets")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

  if (urlError) {
    throw new Error("Failed to create signed URL: " + urlError.message);
  }

  const publicUrl = urlData.signedUrl;

  // Update pdf_url in tickets table
  await supabase
    .from("tickets")
    .update({ pdf_url: publicUrl })
    .eq("unique_code", ticket.unique_code);

  return { pdfBuffer, publicUrl, filePath };
}
import { Buffer } from "buffer";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export const generateTicketPDF = async (ticket): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      const buffers: any[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(22).text("Event Ticket", { align: "center" });
      doc.moveDown();

      // Ticket main details
      doc.fontSize(14).text(`Ticket ID: ${ticket.id}`);
      doc.text(`Unique Code: ${ticket.unique_code}`);
      doc.moveDown();

      // QR Code
      const qrDataUrl = await QRCode.toDataURL(ticket.unique_code);
      const base64Image = qrDataUrl.split(";base64,").pop();

      doc.image(Buffer.from(base64Image, "base64"), {
        fit: [200, 200],
        align: "center",
        valign: "center",
      });

      doc.end();
    } catch (err) {
      console.error("PDF Generator Error:", err);
      reject(err);
    }
  });
};
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateticketPDF(ticket, savePath: string) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });

    const writeStream = fs.createWriteStream(savePath);
    doc.pipe(writeStream);

    doc.fontSize(22).text("EVENT TICKET", { align: "center" }).moveDown();

    doc
      .fontSize(14)
      .text(`Ticket ID: ${ticket.id}`)
      .text(`Unique Code: ${ticket.unique_code}`)
      .text(`Holder Name: ${ticket.holder_name || "Not Provided"}`)
      .text(`Event ID: ${ticket.event_id}`)
      .moveDown();

    doc.text("Scan the QR below:").moveDown();

    // Insert QR image if exists
    if (ticket.qr_code_url) {
      const base64Data = ticket.qr_code_url.replace(/^data:image\/png;base64,/, "");
      const imgPath = path.join(__dirname, "qr_tmp.png");
      fs.writeFileSync(imgPath, base64Data, "base64");

      doc.image(imgPath, { width: 150 });
      fs.unlinkSync(imgPath);
    }

    doc.end();

    writeStream.on("finish", () => resolve(savePath));
    writeStream.on("error", reject);
  });
}
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import fs from "fs";

interface Field {
  value: string;
  x: number; // percentage: 0-100
  y: number; // percentage: 0-100
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: string;
}

export type OutputFormat = "pdf" | "png" | "jpg";

export const generateCertificate = async (
  templatePath: string,
  fields: Field[],
  outputPath: string,
  format: OutputFormat
) => {
  // ----------------------------------------
  // Get template dimensions FIRST
  // ----------------------------------------

  const metadata = await sharp(templatePath).metadata();

  const width = metadata.width || 1200;
  const height = metadata.height || 800;

  console.log("Template dimensions:", {
    width,
    height,
  });

  // ----------------------------------------
  // Create SVG text overlay
  // ----------------------------------------

  const svgText = fields
    .map((field) => {
      const text = field.value || "";

      // ------------------------------------
      // IMPORTANT:
      // Frontend stores x/y as percentages.
      // Convert percentage -> actual pixels.
      // ------------------------------------

      const x = (field.x / 100) * width;
      const y = (field.y / 100) * height;

      let anchor = "start";

      if (field.alignment === "center") {
        anchor = "middle";
      } else if (field.alignment === "right") {
        anchor = "end";
      }

      console.log("Rendering field:", {
        fieldName: field.value,
        percentageX: field.x,
        percentageY: field.y,
        pixelX: x,
        pixelY: y,
      });

      return `
        <text
          x="${x}"
          y="${y}"
          font-family="${escapeXml(field.fontFamily)}"
          font-size="${field.fontSize}px"
          fill="${field.color}"
          text-anchor="${anchor}"
        >
          ${escapeXml(text)}
        </text>
      `;
    })
    .join("");

  // ----------------------------------------
  // Create SVG
  // ----------------------------------------

  const svg = `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      ${svgText}
    </svg>
  `;

  // ----------------------------------------
  // Create certificate image
  // ----------------------------------------

  const certificate = sharp(templatePath).composite([
    {
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    },
  ]);

  // ========================================
  // PNG
  // ========================================

  if (format === "png") {
    const pngBuffer = await certificate
      .png()
      .toBuffer();

    await fs.promises.writeFile(
      outputPath,
      pngBuffer
    );

    return pngBuffer;
  }

  // ========================================
  // JPG
  // ========================================

  if (format === "jpg") {
    const jpgBuffer = await certificate
      .jpeg({
        quality: 95,
      })
      .toBuffer();

    await fs.promises.writeFile(
      outputPath,
      jpgBuffer
    );

    return jpgBuffer;
  }

  // ========================================
  // PDF
  // ========================================

  if (format === "pdf") {
    // Render certificate as PNG in memory
    const pngBuffer = await certificate
      .png()
      .toBuffer();

    // Create PDF
    const pdfDoc = await PDFDocument.create();

    // Embed PNG
    const image = await pdfDoc.embedPng(
      pngBuffer
    );

    // Create PDF page using same dimensions
    const page = pdfDoc.addPage([
      width,
      height,
    ]);

    // Draw certificate
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });

    // Generate PDF
    const pdfBytes = await pdfDoc.save();

    // Save PDF
    await fs.promises.writeFile(
      outputPath,
      pdfBytes
    );

    return Buffer.from(pdfBytes);
  }

  throw new Error(
    `Unsupported output format: ${format}`
  );
};

// ----------------------------------------
// Escape XML special characters
// ----------------------------------------

const escapeXml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};
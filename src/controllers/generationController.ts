import { Response } from "express";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  generateCertificate,
  OutputFormat,
} from "../utils/certificateGenerator";

export const generateCertificate = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      templateId,
      data,
      outputFormat = "pdf",
    } = req.body;

    // ----------------------------------------
    // Validate required fields
    // ----------------------------------------

    if (!templateId || !data) {
      return res.status(400).json({
        message:
          "templateId and data are required",
      });
    }

    // ----------------------------------------
    // Validate output format
    // ----------------------------------------

    const allowedFormats: OutputFormat[] = [
      "pdf",
      "png",
      "jpg",
    ];

    if (
      !allowedFormats.includes(
        outputFormat as OutputFormat
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid output format. Choose pdf, png, or jpg",
      });
    }

    const format = outputFormat as OutputFormat;

    // ----------------------------------------
    // Find template and verify ownership
    // ----------------------------------------

    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        automation: {
          userId: req.userId,
        },
      },
      include: {
        fields: {
          include: {
            mappings: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        message: "Template not found",
      });
    }

    // ----------------------------------------
    // Resolve template fields
    // ----------------------------------------

    const fields = template.fields.map(
      (field) => {
        const mapping = field.mappings[0];

        return {
          value: mapping
            ? String(
                data[
                  mapping.columnName
                ] ?? ""
              )
            : "",
          x: field.x,
          y: field.y,
          fontSize: field.fontSize,
          fontFamily: field.fontFamily,
          color: field.color,
          alignment: field.alignment,
        };
      }
    );

    // ----------------------------------------
    // Template path
    // ----------------------------------------

    const templatePath = path.join(
      process.cwd(),
      "uploads",
      "templates",
      path.basename(template.fileUrl)
    );

    console.log(
      "Template file URL:",
      template.fileUrl
    );

    console.log(
      "Template physical path:",
      templatePath
    );

    console.log(
      "Template exists:",
      fs.existsSync(templatePath)
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        message: "Template file not found",
      });
    }

    // ----------------------------------------
    // Output directory
    // ----------------------------------------

    const outputDir = path.join(
      process.cwd(),
      "uploads",
      "generated"
    );

    fs.mkdirSync(outputDir, {
      recursive: true,
    });

    // ----------------------------------------
    // File name
    // ----------------------------------------

    const fileName = `certificate-${Date.now()}.${format}`;

    const outputPath = path.join(
      outputDir,
      fileName
    );

    // ----------------------------------------
    // Generate certificate
    // ----------------------------------------

    const certificateBuffer =
      await generateCertificate(
        templatePath,
        fields,
        outputPath,
        format
      );

    // ----------------------------------------
    // Content type
    // ----------------------------------------

    let contentType: string;

    if (format === "pdf") {
      contentType = "application/pdf";
    } else if (format === "png") {
      contentType = "image/png";
    } else {
      contentType = "image/jpeg";
    }

    // ----------------------------------------
    // Send file to browser
    // ----------------------------------------

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.send(certificateBuffer);
  } catch (error) {
    console.error(
      "GENERATE CERTIFICATE ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to generate certificate",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
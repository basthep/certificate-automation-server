import { Response } from "express";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  generateCertificate,
  OutputFormat,
} from "../utils/certificateGenerator";
import { sendCertificateEmail } from "../utils/email";

export const generateBulkCertificates = async (
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
      dataFileId,
      outputFormat = "pdf",
    } = req.body;

    // ----------------------------------------
    // Validate required fields
    // ----------------------------------------

    if (!templateId || !dataFileId) {
      return res.status(400).json({
        message:
          "templateId and dataFileId are required",
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
    // Find template image
    // ----------------------------------------

    const templatePath = path.join(
      process.cwd(),
      "uploads",
      "templates",
      path.basename(template.fileUrl)
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        message: "Template file not found",
      });
    }

    // ----------------------------------------
    // Check Excel / CSV file
    // ----------------------------------------

    const dataFile =
      await prisma.dataFile.findFirst({
        where: {
          id: dataFileId,
          automation: {
            userId: req.userId,
          },
        },
      });

    if (!dataFile) {
      return res.status(404).json({
        message: "Data file not found",
      });
    }

    const dataFilePath = dataFile.fileUrl;

    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json({
        message: "Stored data file could not be found",
      });
    }

    // ----------------------------------------
    // Read Excel / CSV
    // ----------------------------------------

    const workbook = XLSX.readFile(dataFilePath);

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        message: "No worksheet found",
      });
    }

    const sheet = workbook.Sheets[sheetName];

    const rows =
      XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet
      );

    if (!rows.length) {
      return res.status(400).json({
        message:
          "No data found in Excel/CSV file",
      });
    }

    // ----------------------------------------
    // Create batch output directory
    // ----------------------------------------

    const outputDir = path.join(
      process.cwd(),
      "uploads",
      "generated",
      `batch-${Date.now()}`
    );

    fs.mkdirSync(outputDir, {
      recursive: true,
    });

    // ----------------------------------------
    // Counters
    // ----------------------------------------

    let generatedCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    const failedEmails: {
      name: string;
      email: string;
      error: string;
    }[] = [];

    const certificateResults: {
      id: string;
      name: string;
      email: string;
      format: OutputFormat;
      status: string;
      error?: string;
    }[] = [];

    // ----------------------------------------
    // Process each participant
    // ----------------------------------------

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const participantName = String(
        row["name"] ||
          `Participant ${i + 1}`
      ).trim();

      const email = String(
        row["email"] || ""
      ).trim();

      // ----------------------------------------
      // Resolve template fields
      // ----------------------------------------

      const fields = template.fields.map(
        (field) => {
          const mapping = field.mappings[0];

          return {
            value: mapping
              ? String(
                  row[
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
      // Safe filename
      // ----------------------------------------

      const safeName = participantName
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "_"
        )
        .substring(0, 80);

      const fileName = `${i + 1}-${safeName}.${format}`;

      const outputPath = path.join(
        outputDir,
        fileName
      );

      // ----------------------------------------
      // Create certificate tracking record
      // ----------------------------------------

      const certificate =
        await prisma.certificate.create({
          data: {
            participantName,
            email,
            filePath: outputPath,
            format,
            status: "PENDING",
            templateId: template.id,
          },
        });

      // ----------------------------------------
      // Missing email
      // ----------------------------------------

      if (!email) {
        const errorMessage =
          "Email address is missing";

        failedCount++;

        await prisma.certificate.update({
          where: {
            id: certificate.id,
          },
          data: {
            status: "FAILED",
            errorMessage,
          },
        });

        failedEmails.push({
          name: participantName,
          email: "",
          error: errorMessage,
        });

        certificateResults.push({
          id: certificate.id,
          name: participantName,
          email: "",
          format,
          status: "FAILED",
          error: errorMessage,
        });

        console.log(
          `Skipping ${participantName}: email is missing`
        );

        continue;
      }

      try {
        // ----------------------------------------
        // Generate certificate
        // ----------------------------------------

        await generateCertificate(
          templatePath,
          fields,
          outputPath,
          format
        );

        generatedCount++;

        console.log(
          `${format.toUpperCase()} certificate generated for ${participantName}`
        );

        // ----------------------------------------
        // Send certificate email
        // ----------------------------------------

        await sendCertificateEmail(
          email,
          participantName,
          outputPath,
          format
        );

        // ----------------------------------------
        // Email successful
        // ----------------------------------------

        sentCount++;

        await prisma.certificate.update({
          where: {
            id: certificate.id,
          },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        certificateResults.push({
          id: certificate.id,
          name: participantName,
          email,
          format,
          status: "SENT",
        });

        console.log(
          `Certificate sent to ${email}`
        );
      } catch (error) {
        // ----------------------------------------
        // Generation or email failed
        // ----------------------------------------

        failedCount++;

        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        await prisma.certificate.update({
          where: {
            id: certificate.id,
          },
          data: {
            status: "FAILED",
            errorMessage,
          },
        });

        failedEmails.push({
          name: participantName,
          email,
          error: errorMessage,
        });

        certificateResults.push({
          id: certificate.id,
          name: participantName,
          email,
          format,
          status: "FAILED",
          error: errorMessage,
        });

        console.error(
          `Failed for ${participantName} (${email}):`,
          errorMessage
        );
      }
    }

    // ----------------------------------------
    // Final response
    // ----------------------------------------

    return res.json({
      message:
        "Bulk certificate generation completed",

      outputFormat: format,

      total: rows.length,

      generated: generatedCount,

      sent: sentCount,

      failed: failedCount,

      failedEmails,

      certificates: certificateResults,
    });
  } catch (error) {
    console.error(
      "BULK GENERATION ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to generate and send certificates",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
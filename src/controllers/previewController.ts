import { Response } from "express";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const previewCertificate = async (
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
      rowIndex = 0,
    } = req.body;

    if (!templateId || !dataFileId) {
      return res.status(400).json({
        message:
          "templateId and dataFileId are required",
      });
    }

    const index = Number(rowIndex);

    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({
        message: "rowIndex must be a valid number",
      });
    }

    // ----------------------------------------
    // Get template + fields + mappings
    // ----------------------------------------

    const template =
      await prisma.template.findFirst({
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
    // Get data file
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

    // ----------------------------------------
    // Resolve actual file path
    // ----------------------------------------

    const dataFilePath = dataFile.fileUrl;

    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json({
        message:
          "Stored data file could not be found",
      });
    }

    // ----------------------------------------
    // Read Excel / CSV
    // ----------------------------------------

    const workbook = XLSX.readFile(
      dataFilePath
    );

    const sheetName =
      workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        message: "No worksheet found",
      });
    }

    const sheet =
      workbook.Sheets[sheetName];

    const rows =
      XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(sheet, {
        defval: "",
      });

    // ----------------------------------------
    // Validate row index
    // ----------------------------------------

    if (index >= rows.length) {
      return res.status(400).json({
        message: "rowIndex is outside the data range",
        rowCount: rows.length,
      });
    }

    const row = rows[index];

    // ----------------------------------------
    // Resolve template fields
    // ----------------------------------------

    const previewFields =
      template.fields.map((field) => {
        const mapping =
          field.mappings[0];

        const value = mapping
          ? row[mapping.columnName] ?? ""
          : "";

        return {
          id: field.id,
          fieldName: field.fieldName,

          value: String(value),

          x: field.x,
          y: field.y,

          fontSize: field.fontSize,
          fontFamily: field.fontFamily,

          color: field.color,
          alignment: field.alignment,
        };
      });

    // ----------------------------------------
    // Response
    // ----------------------------------------

    return res.json({
      template: {
        id: template.id,
        name: template.name,
        fileUrl: template.fileUrl,
      },

      dataFile: {
        id: dataFile.id,
        name: dataFile.name,
        rowIndex: index,
      },

      row,

      fields: previewFields,
    });
  } catch (error) {
    console.error(
      "PREVIEW CERTIFICATE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to generate certificate preview",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
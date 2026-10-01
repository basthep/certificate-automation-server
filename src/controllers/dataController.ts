import { Response } from "express";
import XLSX from "xlsx";
import path from "path";
import prisma from "../lib/prisma";
import fs from 'fs';
import { AuthRequest } from "../middleware/authMiddleware";

export const processData = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const file = req.file;

    const { automationId } = req.body;

    // ----------------------------------------
    // Validate
    // ----------------------------------------

    if (!file) {
      return res.status(400).json({
        message: "Data file is required",
      });
    }

    if (!automationId) {
      return res.status(400).json({
        message: "automationId is required",
      });
    }

    // ----------------------------------------
    // Verify automation ownership
    // ----------------------------------------

    const automation =
      await prisma.automation.findFirst({
        where: {
          id: automationId,
          userId: req.userId,
        },
      });

    if (!automation) {
      return res.status(404).json({
        message: "Automation not found",
      });
    }

    // ----------------------------------------
    // Read Excel / CSV
    // ----------------------------------------

    const workbook = XLSX.readFile(file.path);

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
      >(sheet);

    // ----------------------------------------
    // Detect columns
    // ----------------------------------------

    const columns =
      rows.length > 0
        ? Object.keys(rows[0])
        : [];

    // ----------------------------------------
    // Save database record
    // ----------------------------------------

    const dataFile =
      await prisma.dataFile.create({
        data: {
          name: file.originalname,

          fileUrl: file.path,

          sheetName,

          rowCount: rows.length,

          columns,

          automationId,
        },
      });

    // ----------------------------------------
    // Response
    // ----------------------------------------

    return res.status(201).json({
      message:
        "Data file uploaded successfully",

      dataFile: {
        id: dataFile.id,

        name: dataFile.name,

        fileUrl: dataFile.fileUrl,

        sheetName: dataFile.sheetName,

        rowCount: dataFile.rowCount,

        columns: dataFile.columns,
      },

      preview: rows.slice(0, 5),
    });
  } catch (error) {
    console.error(
      "UPLOAD DATA FILE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to upload data file",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

export const getDataFile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const dataFile = await prisma.dataFile.findFirst({
      where: {
        id: req.params.id,
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
        message: "Data file is missing from storage",
      });
    }

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
        sheet,
        {
          defval: "",
        }
      );

    return res.json({
      dataFile: {
        id: dataFile.id,
        name: dataFile.name,
        fileUrl: dataFile.fileUrl,
        sheetName: dataFile.sheetName,
        rowCount: dataFile.rowCount,
        columns: dataFile.columns,
      },
      preview: rows.slice(0, 5),
    });
  } catch (error) {
    console.error("GET DATA FILE ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch data file",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
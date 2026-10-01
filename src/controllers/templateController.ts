import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const uploadTemplate = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Template file is required",
      });
    }

    const { automationId, name } = req.body;

    if (!automationId || !name) {
      return res.status(400).json({
        message: "Automation ID and template name are required",
      });
    }

    // Make sure the automation belongs to the logged-in user
    const automation = await prisma.automation.findFirst({
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

    const fileUrl = `/uploads/templates/${req.file.filename}`;

    const template = await prisma.template.create({
      data: {
        name,
        fileUrl,
        automationId,
      },
    });

    res.status(201).json({
      message: "Template uploaded successfully",
      template,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to upload template",
    });
  }
};


export const getTemplateById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    const template = await prisma.template.findFirst({
      where: {
        id,
        automation: {
          userId: req.userId,
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        message: "Template not found",
      });
    }

    return res.json({
      template,
    });
  } catch (error) {
    console.error("GET TEMPLATE ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch template",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
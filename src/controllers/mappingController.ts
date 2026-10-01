import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const createMapping = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { templateFieldId, columnName } = req.body;

    if (!templateFieldId || !columnName) {
      return res.status(400).json({
        message: "templateFieldId and columnName are required",
      });
    }

    const field = await prisma.templateField.findFirst({
      where: {
        id: templateFieldId,
        template: {
          automation: {
            userId: req.userId,
          },
        },
      },
    });

    if (!field) {
      return res.status(404).json({
        message: "Template field not found",
      });
    }

    const mapping = await prisma.fieldMapping.upsert({
      where: {
        templateFieldId,
      },
      update: {
        columnName,
      },
      create: {
        templateFieldId,
        columnName,
      },
    });

    res.status(201).json({
      message: "Field mapped successfully",
      mapping,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create mapping",
    });
  }
};

export const getMappings = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const template = await prisma.template.findFirst({
      where: {
        id: req.params.templateId,
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

    const mappings = await prisma.fieldMapping.findMany({
      where: {
        templateField: {
          templateId: template.id,
        },
      },
      include: {
        templateField: true,
      },
    });

    res.json({
      mappings,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch mappings",
    });
  }
};
import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const createTemplateField = async (
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
      fieldName,
      x,
      y,
      fontSize,
      fontFamily,
      color,
      alignment,
    } = req.body;

    if (!templateId || !fieldName || x === undefined || y === undefined) {
      return res.status(400).json({
        message: "templateId, fieldName, x and y are required",
      });
    }

    // Check that the template belongs to the logged-in user
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
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

    const field = await prisma.templateField.create({
      data: {
        fieldName,
        x: Number(x),
        y: Number(y),
        fontSize: fontSize ? Number(fontSize) : 20,
        fontFamily: fontFamily || "Arial",
        color: color || "#000000",
        alignment: alignment || "center",
        templateId,
      },
    });

    res.status(201).json({
      message: "Template field created successfully",
      field,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create template field",
    });
  }
};

export const getTemplateFields = async (
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

    const fields = await prisma.templateField.findMany({
      where: {
        templateId: template.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json({
      fields,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch template fields",
    });
  }
};

export const deleteTemplateField = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const field = await prisma.templateField.findFirst({
      where: {
        id: req.params.id,
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

    await prisma.templateField.delete({
      where: {
        id: field.id,
      },
    });

    res.json({
      message: "Template field deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete template field",
    });
  }
};


export const updateTemplateField = async (
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

    const {
      fieldName,
      x,
      y,
      fontSize,
      fontFamily,
      color,
      alignment,
    } = req.body;

    const field = await prisma.templateField.findFirst({
      where: {
        id,
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

    const updatedField =
      await prisma.templateField.update({
        where: {
          id,
        },
        data: {
          ...(fieldName !== undefined && {
            fieldName,
          }),
          ...(x !== undefined && {
            x: Number(x),
          }),
          ...(y !== undefined && {
            y: Number(y),
          }),
          ...(fontSize !== undefined && {
            fontSize: Number(fontSize),
          }),
          ...(fontFamily !== undefined && {
            fontFamily,
          }),
          ...(color !== undefined && {
            color,
          }),
          ...(alignment !== undefined && {
            alignment,
          }),
        },
      });

    return res.json({
      message: "Template field updated successfully",
      field: updatedField,
    });
  } catch (error) {
    console.error(
      "UPDATE TEMPLATE FIELD ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to update template field",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
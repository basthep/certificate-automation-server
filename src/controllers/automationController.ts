import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const createAutomation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Name and type are required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const automation = await prisma.automation.create({
      data: {
        name,
        type,
        description,
        userId: req.userId,
      },
    });

    res.status(201).json({
      message: "Automation created successfully",
      automation,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create automation",
    });
  }
};

export const getAutomations = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const automations = await prisma.automation.findMany({
      where: {
        userId: req.userId,
      },
      include: {
        templates: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      automations,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch automations",
    });
  }
};


export const getAutomation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const automation = await prisma.automation.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        templates: {
          include: {
            certificates: true,
          },
        },
      },
    });

    if (!automation) {
      return res.status(404).json({
        message: "Automation not found",
      });
    }

    const certificates = automation.templates.flatMap(
      (template) => template.certificates
    );

    const stats = {
      certificates: certificates.length,

      sent: certificates.filter(
        (certificate) =>
          certificate.status === "SENT"
      ).length,

      failed: certificates.filter(
        (certificate) =>
          certificate.status === "FAILED"
      ).length,
    };

    res.json({
      automation: {
        id: automation.id,
        name: automation.name,
        type: automation.type,
        description: automation.description,
        createdAt: automation.createdAt,
        updatedAt: automation.updatedAt,
      },

      stats,

      certificates: certificates.map(
        (certificate) => ({
          id: certificate.id,
          participantName:
            certificate.participantName,
          email: certificate.email,
          format: certificate.format,
          status: certificate.status,
          createdAt: certificate.createdAt,
        })
      ),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch automation",
    });
  }
};


export const deleteAutomation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const automation = await prisma.automation.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!automation) {
      return res.status(404).json({
        message: "Automation not found",
      });
    }

    await prisma.automation.delete({
      where: {
        id: automation.id,
      },
    });

    res.json({
      message: "Automation deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete automation",
    });
  }
};
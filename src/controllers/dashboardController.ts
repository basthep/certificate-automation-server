import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // ----------------------------------------
    // Automations
    // ----------------------------------------

    const totalAutomations =
      await prisma.automation.count({
        where: {
          userId: req.userId,
        },
      });

    // ----------------------------------------
    // Certificates
    // ----------------------------------------

    const certificateWhere = {
      template: {
        automation: {
          userId: req.userId,
        },
      },
    };

    const totalCertificates =
      await prisma.certificate.count({
        where: certificateWhere,
      });

    const sentCertificates =
      await prisma.certificate.count({
        where: {
          ...certificateWhere,
          status: "SENT",
        },
      });

    const failedCertificates =
      await prisma.certificate.count({
        where: {
          ...certificateWhere,
          status: "FAILED",
        },
      });

    const pendingCertificates =
      await prisma.certificate.count({
        where: {
          ...certificateWhere,
          status: "PENDING",
        },
      });

    // ----------------------------------------
    // Templates
    // ----------------------------------------

    const totalTemplates =
      await prisma.template.count({
        where: {
          automation: {
            userId: req.userId,
          },
        },
      });

    // ----------------------------------------
    // Recent certificates
    // ----------------------------------------

    const recentCertificates =
      await prisma.certificate.findMany({
        where: certificateWhere,
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          participantName: true,
          email: true,
          format: true,
          status: true,
          errorMessage: true,
          sentAt: true,
          createdAt: true,
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    // ----------------------------------------
    // Response
    // ----------------------------------------

    return res.json({
      stats: {
        automations: totalAutomations,
        templates: totalTemplates,
        certificates: totalCertificates,
        sent: sentCertificates,
        failed: failedCertificates,
        pending: pendingCertificates,
      },
    });
  } catch (error) {
    console.error(
      "GET DASHBOARD STATS ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch dashboard statistics",
    });
  }
};
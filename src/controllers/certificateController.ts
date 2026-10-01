import { Response } from "express";
import fs from "fs";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  sendCertificateEmail,
} from "../utils/email";
import {
  OutputFormat,
} from "../utils/certificateGenerator";

export const getCertificates = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const certificates =
      await prisma.certificate.findMany({
        where: {
          template: {
            automation: {
              userId: req.userId,
            },
          },
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              automationId: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      total: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error(
      "GET CERTIFICATES ERROR:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch certificates",
    });
  }
};



export const retryCertificateEmail = async (
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

    if (!id) {
      return res.status(400).json({
        message: "Certificate ID is required",
      });
    }

    // ----------------------------------------
    // Find certificate and verify ownership
    // ----------------------------------------

    const certificate =
      await prisma.certificate.findFirst({
        where: {
          id,
          template: {
            automation: {
              userId: req.userId,
            },
          },
        },
      });

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found",
      });
    }

    // ----------------------------------------
    // Only FAILED certificates can be retried
    // ----------------------------------------

    if (certificate.status !== "FAILED") {
      return res.status(400).json({
        message:
          "Only failed certificates can be retried",
        status: certificate.status,
      });
    }

    // ----------------------------------------
    // Check certificate file
    // ----------------------------------------

    if (!fs.existsSync(certificate.filePath)) {
      return res.status(404).json({
        message:
          "Generated certificate file not found",
      });
    }

    // ----------------------------------------
    // Mark as PENDING
    // ----------------------------------------

    await prisma.certificate.update({
      where: {
        id: certificate.id,
      },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });

    try {
      // ----------------------------------------
      // Send existing certificate
      // ----------------------------------------

      await sendCertificateEmail(
        certificate.email,
        certificate.participantName,
        certificate.filePath,
        certificate.format as OutputFormat
      );

      // ----------------------------------------
      // Mark as SENT
      // ----------------------------------------

      const updatedCertificate =
        await prisma.certificate.update({
          where: {
            id: certificate.id,
          },
          data: {
            status: "SENT",
            errorMessage: null,
            sentAt: new Date(),
          },
        });

      return res.json({
        message:
          "Certificate email sent successfully",
        certificate: updatedCertificate,
      });
    } catch (error) {
      // ----------------------------------------
      // Email failed again
      // ----------------------------------------

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      const updatedCertificate =
        await prisma.certificate.update({
          where: {
            id: certificate.id,
          },
          data: {
            status: "FAILED",
            errorMessage,
          },
        });

      return res.status(500).json({
        message:
          "Failed to resend certificate email",
        error: errorMessage,
        certificate: updatedCertificate,
      });
    }
  } catch (error) {
    console.error(
      "RETRY CERTIFICATE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to retry certificate email",
    });
  }
};
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

type CertificateFormat = "pdf" | "png" | "jpg";

export const sendCertificateEmail = async (
  email: string,
  participantName: string,
  certificatePath: string,
  format: CertificateFormat
) => {
  let contentType: string;

  if (format === "pdf") {
    contentType = "application/pdf";
  } else if (format === "png") {
    contentType = "image/png";
  } else {
    contentType = "image/jpeg";
  }

  await transporter.sendMail({
    from: `"Certificate Automation" <${process.env.SMTP_USER}>`,

    to: email,

    subject: "Your Certificate",

    text: `Hello ${participantName},

Please find your certificate attached.

Thank you.`,

    attachments: [
      {
        filename: `${participantName}-Certificate.${format}`,

        path: certificatePath,

        contentType,
      },
    ],
  });
};
 

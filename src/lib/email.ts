import nodemailer from "nodemailer";

interface SendMailOptions {
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export async function sendEmail({ subject, html, attachments }: SendMailOptions) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CORREOS_DESTINO } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CORREOS_DESTINO) {
    throw new Error("Faltan configurar las variables de entorno SMTP");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: parseInt(SMTP_PORT || "587") === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Useful for some corporate SMTP servers
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER,
    to: CORREOS_DESTINO,
    subject,
    html,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

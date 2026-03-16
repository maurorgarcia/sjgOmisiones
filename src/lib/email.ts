import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

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

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Faltan configurar las variables de entorno SMTP");
  }

  // 1) Buscar destinatarios activos en Supabase
  const { data: rows, error } = await supabase
    .from("destinatarios_reportes")
    .select("email")
    .eq("activo", true);

  if (error) {
    // Si falla la tabla, seguimos usando solo CORREOS_DESTINO
    console.error("Error leyendo destinatarios_reportes:", error);
  }

  const toFromDb =
    rows?.map((r: { email: string | null }) => r.email).filter(Boolean) ?? [];

  const to =
    toFromDb.length > 0
      ? toFromDb.join(",")
      : CORREOS_DESTINO;

  if (!to) {
    throw new Error("No hay destinatarios configurados (tabla ni CORREOS_DESTINO).");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: parseInt(SMTP_PORT || "587") === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    html,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

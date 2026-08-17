import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

// Alapértelmezett címzett: az egyedi ajánlatkérések ide érkeznek.
export const DEFAULT_MAIL_TO = "ajanlatkeres@festettszobrok.com";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT || (host ? 587 : 0));
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure:
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
    user,
    pass,
    from:
      process.env.MAIL_FROM?.trim() ||
      user ||
      `Festett Szobrok <${DEFAULT_MAIL_TO}>`,
    to: process.env.MAIL_TO?.trim() || DEFAULT_MAIL_TO,
  };
}

export function isSmtpConfigured(cfg: SmtpConfig): boolean {
  return Boolean(cfg.host && cfg.user && cfg.pass !== undefined && cfg.pass !== "");
}

interface SendMailOptions {
  to?: string;
  from?: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Attachment[];
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const smtp = getSmtpConfig();
  if (!isSmtpConfigured(smtp)) {
    throw new Error("Az e-mail küldés nincs beállítva (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  }
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transporter.sendMail({
    from: opts.from ?? smtp.from,
    to: opts.to ?? smtp.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    ...(opts.attachments && opts.attachments.length > 0
      ? { attachments: opts.attachments }
      : {}),
  });
}

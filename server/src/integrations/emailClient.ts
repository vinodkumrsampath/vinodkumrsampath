import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
    : undefined,
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `Verified <${env.EMAIL_FROM}>`,
    to,
    subject: `Your Verified code: ${otp}`,
    text: `Your verification code is ${otp}. It expires in 10 minutes. Do not share it.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2 style="color:#e11d48">Verified</h2>
        <p>Your verification code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;margin:24px 0">${otp}</div>
        <p style="color:#6b7280;font-size:14px">Expires in 10 minutes. Never share this code.</p>
      </div>
    `,
  });
}

export async function sendSafetyAlertEmail(
  to: string,
  userName: string,
  checkInUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: `Verified Safety <${env.EMAIL_FROM}>`,
    to,
    subject: `${userName} shared a safe meeting check-in with you`,
    text: `${userName} is going on a date and wants you to monitor their check-in. View it here: ${checkInUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2 style="color:#e11d48">Safety Check-In</h2>
        <p><strong>${userName}</strong> is going on a date and has shared a safety check-in with you.</p>
        <p>You can monitor their status and they will check in when they are safe.</p>
        <a href="${checkInUrl}" style="display:inline-block;background:#e11d48;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">View Check-In</a>
        <p style="color:#6b7280;font-size:13px">If you don't hear from them and the check-in shows an SOS alert, please call emergency services.</p>
      </div>
    `,
  });
}

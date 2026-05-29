import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

export const sendEmail = async ({ to, subject, text, html }) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_PASSWORD,
    EMAIL_FROM,
  } = process.env;

  const smtpPass = SMTP_PASS || SMTP_PASSWORD;

  const missing = [];
  if (!SMTP_HOST) missing.push('SMTP_HOST');
  if (!SMTP_PORT) missing.push('SMTP_PORT');
  if (!SMTP_USER) missing.push('SMTP_USER');
  if (!smtpPass) missing.push('SMTP_PASS');

  if (missing.length) {
    throw new Error(
      `Email not configured. Missing env vars: ${missing.join(', ')}.`
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: smtpPass },
  });

  return transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};

export const sendVerificationEmail = async ({ to, verifyUrl }) => {
  const subject = 'Verify your Rentify email';
  const text = `Verify your email address: ${verifyUrl}`;

  const prettyLink = verifyUrl.length > 64 ? `${verifyUrl.slice(0, 42)}…${verifyUrl.slice(-16)}` : verifyUrl;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const logoPath = path.resolve(__dirname, '../../../front/src/assets/logo.png');

  const html = `
    <style>
      @media only screen and (max-width: 480px) {
        .rf-container { padding: 20px 14px !important; }
        .rf-card { padding: 16px !important; }
      }
    </style>
    <div style="margin:0;padding:0;background:#f7f6ff;">
      <div class="rf-container" style="max-width:640px;margin:0 auto;padding:28px 18px;font-family:Arial,sans-serif;color:#111827;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:18px;">
          <tr>
            <td valign="middle" style="padding:0;">
              <img src="cid:rentify-logo" alt="Rentify" width="44" height="44" style="display:block;border-radius:12px;background:#ffffff;border:1px solid rgba(17,24,39,0.08);" />
            </td>
            <td valign="middle" style="padding:0 0 0 16px;height:44px;vertical-align:middle;">
              <span style="display:inline-block;vertical-align:middle;font-size:18px;font-weight:800;letter-spacing:0.2px;color:#111827;line-height:20px;margin:0;padding:0;mso-line-height-rule:exactly;">
                Rentify
              </span>
            </td>
          </tr>
        </table>

        <div class="rf-card" style="background:#ffffff;border:1px solid rgba(17,24,39,0.08);border-radius:16px;padding:18px 18px 16px;">
          <h2 style="margin:0 0 10px 0;font-size:18px;line-height:1.25;color:#111827;">Verify your email</h2>
          <p style="margin:0 0 14px 0;color:rgba(17,24,39,0.75);font-size:13px;line-height:19px;">
            Thanks for signing up for Rentify. Click the button below to verify your email address.
          </p>
          <p style="margin:0 0 16px 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,#a66eff,#7c3aed);color:#fff;text-decoration:none;font-weight:700;">
              Verify email
            </a>
          </p>
          <p style="margin:0;color:rgba(17,24,39,0.62);font-size:11px;line-height:16px;">
            If the button doesn’t work, open:
            <a href="${verifyUrl}" style="color:#6d28d9;text-decoration:underline;">Verification link</a>
          </p>
          <p style="margin:14px 0 0 0;color:rgba(17,24,39,0.60);font-size:11px;line-height:16px;">
            If you didn’t request this, you can safely ignore this email.
          </p>
        </div>

        <div style="margin-top:14px;padding:0 2px;color:rgba(17,24,39,0.55);font-size:11px;line-height:16px;">
          <div>© ${new Date().getFullYear()} Rentify. All rights reserved.</div>
          <div style="margin-top:6px;">This message was sent for account security. Please do not reply.</div>
        </div>
      </div>
    </div>
  `.trim();

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_PASSWORD,
    EMAIL_FROM,
  } = process.env;

  const smtpPass = SMTP_PASS || SMTP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: smtpPass },
  });

  return transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'rentify-logo.png',
        path: logoPath,
        cid: 'rentify-logo',
      },
    ],
  });
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const subject = 'Reset your Rentify password';
  const text = `Reset your password: ${resetUrl}`;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const logoPath = path.resolve(__dirname, '../../../front/src/assets/logo.png');

  const html = `
    <style>
      @media only screen and (max-width: 480px) {
        .rf-container { padding: 20px 14px !important; }
        .rf-card { padding: 16px !important; }
      }
    </style>
    <div style="margin:0;padding:0;background:#f7f6ff;">
      <div class="rf-container" style="max-width:640px;margin:0 auto;padding:28px 18px;font-family:Arial,sans-serif;color:#111827;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:18px;">
          <tr>
            <td valign="middle" style="padding:0;">
              <img src="cid:rentify-logo" alt="Rentify" width="44" height="44" style="display:block;border-radius:12px;background:#ffffff;border:1px solid rgba(17,24,39,0.08);" />
            </td>
            <td valign="middle" style="padding:0 0 0 16px;height:44px;vertical-align:middle;">
              <span style="display:inline-block;vertical-align:middle;font-size:18px;font-weight:800;letter-spacing:0.2px;color:#111827;line-height:20px;margin:0;padding:0;mso-line-height-rule:exactly;">
                Rentify
              </span>
            </td>
          </tr>
        </table>

        <div class="rf-card" style="background:#ffffff;border:1px solid rgba(17,24,39,0.08);border-radius:16px;padding:18px 18px 16px;">
          <h2 style="margin:0 0 10px 0;font-size:18px;line-height:1.25;color:#111827;">Reset your password</h2>
          <p style="margin:0 0 14px 0;color:rgba(17,24,39,0.75);font-size:13px;line-height:19px;">
            We received a request to reset your password. Click the button below to choose a new password.
          </p>
          <p style="margin:0 0 16px 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,#a66eff,#7c3aed);color:#fff;text-decoration:none;font-weight:700;">
              Reset password
            </a>
          </p>
          <p style="margin:0;color:rgba(17,24,39,0.62);font-size:11px;line-height:16px;">
            If the button doesn’t work, open:
            <a href="${resetUrl}" style="color:#6d28d9;text-decoration:underline;">Reset link</a>
          </p>
          <p style="margin:14px 0 0 0;color:rgba(17,24,39,0.60);font-size:11px;line-height:16px;">
            If you didn’t request this, you can safely ignore this email.
          </p>
        </div>

        <div style="margin-top:14px;padding:0 2px;color:rgba(17,24,39,0.55);font-size:11px;line-height:16px;">
          <div>© ${new Date().getFullYear()} Rentify. All rights reserved.</div>
          <div style="margin-top:6px;">This message was sent for account security. Please do not reply.</div>
        </div>
      </div>
    </div>
  `.trim();

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_PASSWORD,
    EMAIL_FROM,
  } = process.env;

  const smtpPass = SMTP_PASS || SMTP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: smtpPass },
  });

  return transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'rentify-logo.png',
        path: logoPath,
        cid: 'rentify-logo',
      },
    ],
  });
};

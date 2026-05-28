import nodemailer from 'nodemailer';

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
  const text = `Verify your email address by opening this link: ${verifyUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Verify your email</h2>
      <p>Thanks for signing up for Rentify.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none;">
          Verify email
        </a>
      </p>
      <p>If the button doesn’t work, copy and paste this link:</p>
      <p>${verifyUrl}</p>
    </div>
  `.trim();

  return sendEmail({ to, subject, text, html });
};

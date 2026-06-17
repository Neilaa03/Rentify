import nodemailer from 'nodemailer';

const fromAddress = process.env.MAIL_FROM || process.env.SMTP_FROM || 'Rentify <no-reply@rentify.local>';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[mailer] ${subject} for ${to}: ${text}`);
    return { skipped: true };
  }

  return transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });
};

export const sendVerificationEmail = ({ to, verifyUrl }) => {
  return sendMail({
    to,
    subject: 'Verify your Rentify email',
    text: `Verify your Rentify email: ${verifyUrl}`,
    html: `<p>Verify your Rentify email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
};

export const sendPasswordResetEmail = ({ to, resetUrl }) => {
  return sendMail({
    to,
    subject: 'Reset your Rentify password',
    text: `Reset your Rentify password: ${resetUrl}`,
    html: `<p>Reset your Rentify password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

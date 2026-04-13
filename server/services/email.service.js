const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const send = async ({ to, subject, html }) => {
  try {
    await getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    logger.error('Email send failed:', err.message);
  }
};

/* ── Welcome email ───────────────────────────────────────────────────── */
exports.sendWelcome = async (email, name) => {
  await send({
    to: email,
    subject: 'Welcome to ShipSplit!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563EB">Welcome to ShipSplit, ${name}!</h2>
        <p>Your account is ready. Start managing shipping labels for Amazon, Flipkart, Meesho, and Myntra — all in one place.</p>
        <a href="${process.env.CLIENT_URL}/dashboard"
           style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
          Go to Dashboard
        </a>
        <p style="color:#6b7280;font-size:13px">Your 7-day free trial starts now. No credit card required.</p>
      </div>
    `,
  });
};

/* ── Password reset ──────────────────────────────────────────────────── */
exports.sendPasswordReset = async (email, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await send({
    to: email,
    subject: 'Reset your ShipSplit password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#111827">Reset your password</h2>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${url}"
           style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

/* ── Email verification ──────────────────────────────────────────────── */
exports.sendEmailVerification = async (email, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await send({
    to: email,
    subject: 'Verify your ShipSplit email',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563EB">Verify your email</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${url}"
           style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
          Verify Email
        </a>
      </div>
    `,
  });
};

/* ── Invoice / subscription confirmation ─────────────────────────────── */
exports.sendInvoice = async (email, { name, plan, amount, paymentId, date }) => {
  await send({
    to: email,
    subject: `ShipSplit — Payment Confirmation ₹${amount}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16A34A">Payment Confirmed</h2>
        <p>Hi ${name}, your payment has been received successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280">Plan</td><td style="font-weight:600;text-transform:capitalize">${plan}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Amount</td><td style="font-weight:600">₹${amount}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Payment ID</td><td>${paymentId}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Date</td><td>${date}</td></tr>
        </table>
        <a href="${process.env.CLIENT_URL}/dashboard/settings?tab=billing"
           style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
          View Subscription
        </a>
      </div>
    `,
  });
};

/* ── Labels ready notification ───────────────────────────────────────── */
exports.sendLabelsReady = async (email, { name, labelCount, downloadUrl }) => {
  await send({
    to: email,
    subject: `ShipSplit — ${labelCount} labels are ready to download`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563EB">Your labels are ready</h2>
        <p>Hi ${name}, <strong>${labelCount} shipping labels</strong> have been generated and are ready to download.</p>
        <a href="${downloadUrl}"
           style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
          Download Labels
        </a>
      </div>
    `,
  });
};

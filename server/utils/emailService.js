import nodemailer from "nodemailer";

// In-memory record for testing and diagnostics in non-production environments
const testSentEmails = [];

export const getTestSentEmails = () => [...testSentEmails];
export const clearTestSentEmails = () => {
  testSentEmails.length = 0;
};

/**
 * Creates configured Nodemailer SMTP transporter.
 * Returns null if SMTP credentials are missing.
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  // If host is Gmail, use Nodemailer's built-in gmail service preset for reliable cloud delivery
  if (host.includes("gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
};

/**
 * Standard email template generator with Fazilnagar town branding
 */
const renderEmailLayout = ({ title, preheader, bodyHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #18232e; padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; }
    .content { padding: 32px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #fee2e2; color: #b8323c; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
    .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; padding: 20px; margin: 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #18232e; }
    .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600; }
    .warning { font-size: 12px; color: #64748b; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #b8323c; margin-top: 24px; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="container">
    <div class="header">
      <h1>Fazilnagar Town Portal</h1>
      <p>फाजिलनगर नागरिक एवं स्थानीय निर्देशिका पोर्टल • PIN 274401</p>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p style="margin: 0;">Fazilnagar Town Civic &amp; Directory Portal • www.fazilnagar.me</p>
      <p style="margin: 4px 0 0 0;">This is an automated security transmission. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send 6-digit registration verification OTP email
 */
export const sendRegistrationOtpEmail = async (toEmail, otp) => {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const subject = "Your Fazilnagar Town Portal Verification Code";
  const from = process.env.SMTP_FROM || `"Fazilnagar Town Portal" <no-reply@fazilnagar.me>`;

  const text = `Fazilnagar Town Portal — Email Verification

Your 6-digit citizen registration verification code is: ${otp}

This code expires in 10 minutes. Enter this code on the portal to activate your account.

If you did not request this verification code, please ignore this email. No citizen account will be created without this verification code.

— Fazilnagar Town Civic & Directory Portal (https://www.fazilnagar.me)`;

  const bodyHtml = `
    <span class="badge">Citizen Registration</span>
    <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 18px;">Verify Your Email Address</h2>
    <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Thank you for registering on the Fazilnagar Town Portal. To complete your account activation, please enter the six-digit verification code below:
    </p>

    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="expiry">Valid for 10 minutes</div>
    </div>

    <div class="warning">
      <strong>Security Notice:</strong> Never share this code with anyone. If you did not initiate this registration request, you can safely ignore this message. No account will be created without entering this code.
    </div>
  `;

  const html = renderEmailLayout({
    title: subject,
    preheader: `Your 6-digit registration verification code is ${otp} (valid for 10 minutes).`,
    bodyHtml,
  });

  // Test mode or unconfigured simulation handling
  if (process.env.NODE_ENV === "test") {
    testSentEmails.push({ to: normalizedEmail, subject, otp, purpose: "registration" });
    return { success: true, simulated: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[EmailService DEV] SMTP unconfigured. Verification OTP for ${normalizedEmail}: ${otp}`);
      testSentEmails.push({ to: normalizedEmail, subject, otp, purpose: "registration" });
      return { success: true, simulated: true };
    }
    throw new Error("SMTP email transport is not configured on this server. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in Render.");
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: normalizedEmail,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[EmailService Error] Failed to send registration email:", err.message);
    const isAuthError =
      err.message?.includes("Invalid login") ||
      err.message?.includes("Username and Password not accepted") ||
      err.code === "EAUTH";
    const isTimeout = err.code === "ETIMEDOUT" || err.message?.includes("timeout");

    if (isAuthError) {
      throw new Error(
        "SMTP authentication failed. If using Gmail, ensure 2-Step Verification is ON and a 16-character App Password is used."
      );
    }
    if (isTimeout) {
      throw new Error("SMTP connection timed out. Please check your SMTP host and port.");
    }
    throw new Error(`Email delivery failed: ${err.message || "Unable to deliver verification email."}`);
  }
};

/**
 * Send 6-digit password reset OTP email
 */
export const sendPasswordResetOtpEmail = async (toEmail, otp) => {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const subject = "Fazilnagar Town Portal Password Reset Code";
  const from = process.env.SMTP_FROM || `"Fazilnagar Town Portal" <no-reply@fazilnagar.me>`;

  const text = `Fazilnagar Town Portal — Password Reset Request

Your 6-digit password reset verification code is: ${otp}

This code expires in 10 minutes. Enter this code on the portal to verify your identity and set a new password.

If you did not request a password reset, please ignore this email. Your current password remains secure and unchanged.

— Fazilnagar Town Civic & Directory Portal (https://www.fazilnagar.me)`;

  const bodyHtml = `
    <span class="badge" style="background:#fef3c7;color:#b45309;">Password Reset</span>
    <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 18px;">Password Reset Request</h2>
    <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
      We received a request to reset the password for your Fazilnagar Town Portal citizen account. Use the six-digit code below to verify your identity:
    </p>

    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="expiry">Valid for 10 minutes</div>
    </div>

    <div class="warning">
      <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account is secure.
    </div>
  `;

  const html = renderEmailLayout({
    title: subject,
    preheader: `Your 6-digit password reset code is ${otp} (valid for 10 minutes).`,
    bodyHtml,
  });

  if (process.env.NODE_ENV === "test") {
    testSentEmails.push({ to: normalizedEmail, subject, otp, purpose: "password_reset" });
    return { success: true, simulated: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[EmailService DEV] SMTP unconfigured. Password reset OTP for ${normalizedEmail}: ${otp}`);
      testSentEmails.push({ to: normalizedEmail, subject, otp, purpose: "password_reset" });
      return { success: true, simulated: true };
    }
    throw new Error("SMTP email transport is not configured on this server. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in Render.");
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: normalizedEmail,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[EmailService Error] Failed to send password reset email:", err.message);
    const isAuthError =
      err.message?.includes("Invalid login") ||
      err.message?.includes("Username and Password not accepted") ||
      err.code === "EAUTH";
    const isTimeout = err.code === "ETIMEDOUT" || err.message?.includes("timeout");

    if (isAuthError) {
      throw new Error(
        "SMTP authentication failed. If using Gmail, ensure 2-Step Verification is ON and a 16-character App Password is used."
      );
    }
    if (isTimeout) {
      throw new Error("SMTP connection timed out. Please check your SMTP host and port.");
    }
    throw new Error(`Email delivery failed: ${err.message || "Unable to deliver password reset email."}`);
  }
};

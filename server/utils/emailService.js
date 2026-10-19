import nodemailer from "nodemailer";
import dns from "dns/promises";
import net from "net";

// In-memory record for testing and diagnostics in non-production environments
const testSentEmails = [];

export const getTestSentEmails = () => [...testSentEmails];
export const clearTestSentEmails = () => {
  testSentEmails.length = 0;
};

/**
 * Safely probes SMTP connectivity stages (DNS, TCP) without logging secrets.
 * Outputs actionable diagnostics to server console to assist deployment debugging.
 */
export async function diagnoseSmtpStages(host, port, secure, timeoutMs = 6000) {
  const result = {
    host,
    port,
    secure,
    dnsSuccess: false,
    resolvedIp: null,
    tcpSuccess: false,
    failingStage: null,
    error: null,
  };

  // Stage 1: DNS Resolution
  const dnsStart = Date.now();
  try {
    const lookup = await dns.lookup(host);
    result.dnsSuccess = true;
    result.resolvedIp = lookup.address;
    console.log(`[SMTP Diagnostic] Stage 1 (DNS): Successfully resolved "${host}" -> ${lookup.address} (${lookup.family === 6 ? "IPv6" : "IPv4"}) in ${Date.now() - dnsStart}ms`);
  } catch (err) {
    result.failingStage = "DNS_RESOLUTION";
    result.error = err.message;
    console.error(`[SMTP Diagnostic] Stage 1 (DNS) FAILED: Could not resolve "${host}": ${err.code || err.message}`);
    return result;
  }

  // Stage 2: TCP Handshake probe
  const tcpStart = Date.now();
  try {
    await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: result.resolvedIp, port }, () => {
        socket.destroy();
        resolve();
      });
      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error(`TCP connection to ${host}:${port} timed out after ${timeoutMs}ms`));
      });
      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });
    });
    result.tcpSuccess = true;
    console.log(`[SMTP Diagnostic] Stage 2 (TCP): Successfully established connection to ${host}:${port} in ${Date.now() - tcpStart}ms`);
  } catch (err) {
    result.failingStage = "TCP_CONNECTION";
    result.error = err.message;
    console.error(`[SMTP Diagnostic] Stage 2 (TCP Handshake) FAILED on port ${port}: ${err.message}`);
    console.warn(
      `[SMTP Diagnostic] Root Cause: Outbound TCP traffic to ${host}:${port} is blocked or dropped by the hosting environment.\n` +
      `Note: Render Free Tier and certain cloud hosts block outbound ports 25, 465, and 587 to prevent abuse.\n` +
      `Solution: Use an HTTPS-based email delivery provider (e.g. RESEND_API_KEY via port 443) which is not restricted by cloud firewalls.`
    );
    return result;
  }

  return result;
}

/**
 * Dispatch transactional email via Resend HTTPS API (Port 443 - Never blocked on Render)
 */
async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  // Resend testing requires onboarding@resend.dev unless a custom domain is verified.
  // If SMTP_FROM contains a public provider (@gmail.com, etc.), safely use onboarding@resend.dev.
  let from = process.env.RESEND_FROM;
  if (!from) {
    const configuredFrom = process.env.SMTP_FROM || "";
    if (!configuredFrom || /@(gmail|yahoo|outlook|hotmail)\.com/i.test(configuredFrom)) {
      from = '"Fazilnagar Town Portal" <onboarding@resend.dev>';
    } else {
      from = configuredFrom;
    }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || `Resend API error (${response.status})`;
    console.error("[EmailService Resend Error]:", errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`[EmailService] Dispatched email to ${to} via Resend HTTPS API (ID: ${data.id})`);
  return { success: true, messageId: data.id, provider: "resend_https" };
}

/**
 * Dispatch transactional email via Brevo HTTPS API (Port 443 - Never blocked on Render)
 */
async function sendViaBrevo({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const fromRaw = process.env.SMTP_FROM || "no-reply@fazilnagar.me";
  const match = fromRaw.match(/(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/);
  const senderName = match?.[1] || "Fazilnagar Town Portal";
  const senderEmail = match?.[2] || fromRaw;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || `Brevo API error (${response.status})`;
    console.error("[EmailService Brevo Error]:", errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`[EmailService] Dispatched email to ${to} via Brevo HTTPS API (ID: ${data.messageId})`);
  return { success: true, messageId: data.messageId, provider: "brevo_https" };
}

/**
 * Creates configured Nodemailer SMTP transporter.
 * Respects configured host and port; allows explicit service override if needed.
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && port === 465);

  if (!host || !user || !pass) {
    return null;
  }

  if (process.env.SMTP_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
      minVersion: "TLSv1.2",
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
 * Unified email dispatch handler with HTTPS REST fallback and safe diagnostic logging
 */
async function deliverEmail({ to, subject, text, html, purpose, otp }) {
  const normalizedEmail = to.trim().toLowerCase();

  // Test mode simulation
  if (process.env.NODE_ENV === "test") {
    testSentEmails.push({ to: normalizedEmail, subject, otp, purpose });
    return { success: true, simulated: true };
  }

  // 1. Try HTTPS API providers first if configured (Port 443 - immune to cloud SMTP port blocks)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend({ to: normalizedEmail, subject, html, text });
    } catch (err) {
      console.error("[EmailService] Resend HTTPS delivery error:", err.message);
      const transporter = getTransporter();
      if (!transporter) {
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }
  }

  if (process.env.BREVO_API_KEY) {
    try {
      return await sendViaBrevo({ to: normalizedEmail, subject, html, text });
    } catch (err) {
      console.error("[EmailService] Brevo HTTPS delivery error:", err.message);
      const transporter = getTransporter();
      if (!transporter) {
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }
  }

  // 2. Fall back to SMTP via Nodemailer
  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[EmailService DEV] Email transport unconfigured. Simulated ${purpose} OTP for ${normalizedEmail}: ${otp}`);
      testSentEmails.push({ to: normalizedEmail, subject, otp, purpose });
      return { success: true, simulated: true };
    }
    throw new Error("Email service is not configured on this server. Please configure RESEND_API_KEY or SMTP credentials in Render.");
  }

  const from = process.env.SMTP_FROM || `"Fazilnagar Town Portal" <no-reply@fazilnagar.me>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: normalizedEmail,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId, provider: "smtp" };
  } catch (err) {
    console.error(`[EmailService Error] Failed to deliver ${purpose} email:`, err.message);

    const isTimeout = err.code === "ETIMEDOUT" || err.message?.includes("timeout") || err.command === "CONN";
    const isAuthError = err.message?.includes("Invalid login") || err.message?.includes("Username and Password not accepted") || err.code === "EAUTH";

    // Trigger diagnostic probe asynchronously to log exact failing stage without delaying client
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    diagnoseSmtpStages(host, port, secure).catch((probeErr) => {
      console.error("[SMTP Diagnostic Probe Error]:", probeErr.message);
    });

    if (isAuthError) {
      console.error("[EmailService] SMTP Authentication failed. Ensure 2-Step Verification is active and a 16-character App Password is used without spaces.");
      throw new Error("Email authentication failed. Please verify email settings or try signing in with Google.");
    }

    if (isTimeout) {
      console.error(`[EmailService] SMTP Connection timed out connecting to ${host}:${port}. Outbound SMTP is likely blocked by hosting environment.`);
      throw new Error("Unable to deliver verification code. The email server is temporarily unreachable. Please try again later or sign in with Google.");
    }

    throw new Error("Unable to deliver verification code. Please try again later or sign in with Google.");
  }
}

/**
 * Send 6-digit registration verification OTP email
 */
export const sendRegistrationOtpEmail = async (toEmail, otp) => {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const subject = "Your Fazilnagar Town Portal Verification Code";

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

  return deliverEmail({
    to: normalizedEmail,
    subject,
    text,
    html,
    purpose: "registration",
    otp,
  });
};

/**
 * Send 6-digit password reset OTP email
 */
export const sendPasswordResetOtpEmail = async (toEmail, otp) => {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const subject = "Fazilnagar Town Portal Password Reset Code";

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

  return deliverEmail({
    to: normalizedEmail,
    subject,
    text,
    html,
    purpose: "password_reset",
    otp,
  });
};

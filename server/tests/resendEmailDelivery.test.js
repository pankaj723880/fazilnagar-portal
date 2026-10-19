import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getSanitizedResendApiKey,
  getSanitizedBrevoApiKey,
  sendViaResend,
  deliverEmail,
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail,
} from "../utils/emailService.js";

describe("Resend Email Delivery & Credential Failure Protection", () => {
  const originalEnv = { ...process.env };
  let originalFetch;

  beforeEach(() => {
    // Clone environment
    process.env = { ...originalEnv };
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore environment and global fetch
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  describe("API Key Sanitization", () => {
    it("returns null when RESEND_API_KEY is not set or empty", () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_KEY;
      assert.strictEqual(getSanitizedResendApiKey(), null);

      process.env.RESEND_API_KEY = "";
      assert.strictEqual(getSanitizedResendApiKey(), null);

      process.env.RESEND_API_KEY = "   ";
      assert.strictEqual(getSanitizedResendApiKey(), null);
    });

    it("strips whitespace and newlines from RESEND_API_KEY", () => {
      process.env.RESEND_API_KEY = "  re_12345abcdef  \r\n";
      assert.strictEqual(getSanitizedResendApiKey(), "re_12345abcdef");
    });

    it("strips accidental double quotes from copy-pasting into cloud dashboard", () => {
      process.env.RESEND_API_KEY = '"re_98765xyz"';
      assert.strictEqual(getSanitizedResendApiKey(), "re_98765xyz");

      process.env.RESEND_API_KEY = '  "re_98765xyz"  ';
      assert.strictEqual(getSanitizedResendApiKey(), "re_98765xyz");
    });

    it("strips accidental single quotes from copy-pasting into cloud dashboard", () => {
      process.env.RESEND_API_KEY = "'re_55555abc'";
      assert.strictEqual(getSanitizedResendApiKey(), "re_55555abc");

      process.env.RESEND_API_KEY = "  're_55555abc'  ";
      assert.strictEqual(getSanitizedResendApiKey(), "re_55555abc");
    });

    it("falls back to RESEND_KEY if RESEND_API_KEY is not set", () => {
      delete process.env.RESEND_API_KEY;
      process.env.RESEND_KEY = "re_fallback_key";
      assert.strictEqual(getSanitizedResendApiKey(), "re_fallback_key");
    });

    it("rejects literal placeholders like 'null' or 'undefined'", () => {
      process.env.RESEND_API_KEY = "null";
      assert.strictEqual(getSanitizedResendApiKey(), null);

      process.env.RESEND_API_KEY = "undefined";
      assert.strictEqual(getSanitizedResendApiKey(), null);
    });

    it("sanitizes BREVO_API_KEY similarly", () => {
      process.env.BREVO_API_KEY = ' "xkeysib-123456" ';
      assert.strictEqual(getSanitizedBrevoApiKey(), "xkeysib-123456");
    });
  });

  describe("Resend HTTPS API Request & Mocked Delivery", () => {
    it("successfully delivers email via Resend HTTPS API with correct headers and payload", async () => {
      process.env.RESEND_API_KEY = ' "re_mock_valid_key_12345" ';
      process.env.SMTP_FROM = "Fazilnagar Town Portal <rojgarsathi83@gmail.com>";

      let capturedUrl = null;
      let capturedMethod = null;
      let capturedHeaders = null;
      let capturedBody = null;

      globalThis.fetch = async (url, options) => {
        capturedUrl = url;
        capturedMethod = options.method;
        capturedHeaders = options.headers;
        capturedBody = JSON.parse(options.body);

        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "resend_msg_test_001" }),
        };
      };

      const result = await sendViaResend({
        to: "citizen@fazilnagar.test",
        subject: "Your OTP Code",
        html: "<p>OTP: 123456</p>",
        text: "OTP: 123456",
      });

      assert.strictEqual(capturedUrl, "https://api.resend.com/emails");
      assert.strictEqual(capturedMethod, "POST");
      assert.strictEqual(capturedHeaders["Authorization"], "Bearer re_mock_valid_key_12345");
      assert.strictEqual(capturedHeaders["Content-Type"], "application/json");
      assert.deepStrictEqual(capturedBody.to, ["citizen@fazilnagar.test"]);
      assert.strictEqual(capturedBody.subject, "Your OTP Code");
      // Public Gmail from address must be sanitized to onboarding@resend.dev for Resend delivery
      assert.ok(capturedBody.from.includes("onboarding@resend.dev"));

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, "resend_msg_test_001");
      assert.strictEqual(result.provider, "resend_https");
    });

    it("handles Resend 401 Invalid API Key response with structured auth error", async () => {
      process.env.RESEND_API_KEY = "re_invalid_test_key";

      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            statusCode: 401,
            message: "API key is invalid",
            name: "application_error",
          }),
        };
      };

      await assert.rejects(
        async () => {
          await sendViaResend({
            to: "citizen@fazilnagar.test",
            subject: "Verification",
            html: "<p>OTP: 111222</p>",
            text: "OTP: 111222",
          });
        },
        (err) => {
          assert.strictEqual(err.status, 401);
          assert.strictEqual(err.isAuthError, true);
          assert.strictEqual(err.provider, "resend");
          assert.ok(err.message.includes("API key is invalid"));
          // Ensure secret key is not in error message
          assert.ok(!err.message.includes("re_invalid_test_key"));
          return true;
        }
      );
    });
  });

  describe("deliverEmail Fallback Protection (Preventing Render SMTP Timeouts)", () => {
    it("aborts fallback and throws safe error immediately when Resend authentication fails, never triggering SMTP", async () => {
      // Force deliverEmail to execute without test-mode simulation
      process.env.NODE_ENV = "production";
      process.env.RESEND_API_KEY = "re_invalid_key";

      // Configure SMTP as if present in Render environment
      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "someone@gmail.com";
      process.env.SMTP_PASS = "app_password_1234";

      let fetchCallCount = 0;
      globalThis.fetch = async () => {
        fetchCallCount++;
        return {
          ok: false,
          status: 401,
          json: async () => ({
            statusCode: 401,
            message: "API key is invalid",
            name: "application_error",
          }),
        };
      };

      // deliverEmail should reject immediately with a safe error and NOT attempt SMTP
      await assert.rejects(
        async () => {
          await deliverEmail({
            to: "user@fazilnagar.test",
            subject: "Test Code",
            text: "Code: 654321",
            html: "<p>Code: 654321</p>",
            purpose: "password_reset",
            otp: "654321",
          });
        },
        (err) => {
          // Safe error message returned to caller
          assert.ok(
            err.message.includes("Email service authentication failed"),
            `Unexpected error message: ${err.message}`
          );
          // Never expose the key in error message
          assert.ok(!err.message.includes("re_invalid_key"));
          return true;
        }
      );

      // Verify fetch was called once
      assert.strictEqual(fetchCallCount, 1);
    });

    it("aborts fallback when Resend returns testing domain restriction error", async () => {
      process.env.NODE_ENV = "production";
      process.env.RESEND_API_KEY = "re_valid_key";
      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "user@gmail.com";
      process.env.SMTP_PASS = "pass";

      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            statusCode: 403,
            message: "You can only send testing emails to your own email address (owner@example.com).",
            name: "validation_error",
          }),
        };
      };

      await assert.rejects(
        async () => {
          await deliverEmail({
            to: "other_user@fazilnagar.test",
            subject: "Verification",
            text: "OTP: 999888",
            html: "<p>OTP: 999888</p>",
            purpose: "registration",
            otp: "999888",
          });
        },
        (err) => {
          assert.ok(err.message.includes("Email delivery restricted by provider"));
          return true;
        }
      );
    });

    it("auto-retries with onboarding@resend.dev when custom domain is not verified, and succeeds", async () => {
      process.env.NODE_ENV = "production";
      process.env.RESEND_API_KEY = "re_valid_key";
      process.env.SMTP_FROM = "Fazilnagar Town Portal <no-reply@fazilnagar.me>";

      const sendersAttempted = [];
      globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        sendersAttempted.push(body.from);

        if (body.from.includes("fazilnagar.me")) {
          return {
            ok: false,
            status: 403,
            json: async () => ({
              statusCode: 403,
              message: "The fazilnagar.me domain is not verified. Please, add and verify your domain on https://resend.com/domains",
              name: "validation_error",
            }),
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "msg_retry_domain_ok" }),
        };
      };

      const result = await sendViaResend({
        to: "citizen@fazilnagar.test",
        subject: "Verification",
        html: "<p>OTP: 123456</p>",
        text: "OTP: 123456",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, "msg_retry_domain_ok");
      // Verify first attempt was custom domain, second attempt was onboarding@resend.dev
      assert.strictEqual(sendersAttempted.length, 2);
      assert.ok(sendersAttempted[0].includes("fazilnagar.me"));
      assert.ok(sendersAttempted[1].includes("onboarding@resend.dev"));
    });

    it("aborts SMTP fallback when unverified custom domain message is returned and test sender also cannot deliver", async () => {
      process.env.NODE_ENV = "production";
      process.env.RESEND_API_KEY = "re_valid_key";
      process.env.SMTP_FROM = "Fazilnagar Town Portal <no-reply@fazilnagar.me>";
      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "user@gmail.com";
      process.env.SMTP_PASS = "pass";

      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            statusCode: 403,
            message: "The fazilnagar.me domain is not verified. Please, add and verify your domain on https://resend.com/domains",
            name: "validation_error",
          }),
        };
      };

      await assert.rejects(
        async () => {
          await deliverEmail({
            to: "citizen@fazilnagar.test",
            subject: "Verification",
            text: "OTP: 999888",
            html: "<p>OTP: 999888</p>",
            purpose: "registration",
            otp: "999888",
          });
        },
        (err) => {
          // Verify it did not fall back to SMTP and threw safe restriction error
          assert.ok(err.message.includes("Email delivery restricted by provider"));
          return true;
        }
      );
    });

    it("successfully delivers registration and password-reset OTP emails when Resend is healthy", async () => {
      process.env.NODE_ENV = "production";
      process.env.RESEND_API_KEY = "re_working_key_123";

      let capturedBody = null;
      globalThis.fetch = async (url, options) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "msg_ok_123" }),
        };
      };

      const regResult = await sendRegistrationOtpEmail("citizen@fazilnagar.test", "482910");
      assert.strictEqual(regResult.success, true);
      assert.strictEqual(regResult.messageId, "msg_ok_123");
      assert.ok(capturedBody.text.includes("482910"));
      assert.ok(capturedBody.html.includes("482910"));

      const resetResult = await sendPasswordResetOtpEmail("citizen@fazilnagar.test", "719304");
      assert.strictEqual(resetResult.success, true);
      assert.strictEqual(resetResult.messageId, "msg_ok_123");
      assert.ok(capturedBody.text.includes("719304"));
      assert.ok(capturedBody.html.includes("719304"));
    });
  });
});

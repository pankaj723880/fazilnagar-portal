import { OAuth2Client } from "google-auth-library";

let oauthClientInstance = null;

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!oauthClientInstance || oauthClientInstance._clientId !== clientId) {
    oauthClientInstance = new OAuth2Client(clientId);
    oauthClientInstance._clientId = clientId;
  }
  return oauthClientInstance;
};

/**
 * Validates Google ID token using Google's official google-auth-library.
 * Validates audience, issuer, expiration, and verified email status.
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    throw new Error("Google credential ID token is required.");
  }

  const tokenStr = idToken.trim();

  // Test environment mock bypass for deterministic local unit test suite
  if (process.env.NODE_ENV === "test" && tokenStr.startsWith("test-google-token:")) {
    const parts = tokenStr.split(":");
    // format: test-google-token:sub:email:name:email_verified:audience
    const sub = parts[1] || "google_sub_123456";
    const email = (parts[2] || "google_user@example.com").toLowerCase().trim();
    const name = parts[3] || "Google Citizen";
    const email_verified = parts[4] !== "unverified";
    const audience = parts[5] || process.env.GOOGLE_CLIENT_ID || "test-google-client-id";

    const expectedAudience = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
    if (audience !== expectedAudience) {
      throw new Error("Google token audience mismatch.");
    }

    if (!email_verified) {
      throw new Error("Google account email address is not verified.");
    }

    return {
      sub,
      email,
      name,
      picture: "https://lh3.googleusercontent.com/a/default-avatar",
    };
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in backend environment variables.");
  }

  const client = getOAuthClient();
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: tokenStr,
      audience: googleClientId,
    });
  } catch (err) {
    throw new Error(`Google token verification failed: ${err.message}`);
  }

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid Google token: payload could not be extracted.");
  }

  // 1. Validate issuer
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Invalid token issuer. Token was not issued by Google.");
  }

  // 2. Validate email presence & verified status
  if (!payload.email) {
    throw new Error("Google ID token does not contain an email address.");
  }

  if (payload.email_verified !== true) {
    throw new Error("Google account email address is not verified.");
  }

  // 3. Validate subject identifier
  if (!payload.sub) {
    throw new Error("Google ID token missing subject identifier (sub).");
  }

  return {
    sub: String(payload.sub),
    email: payload.email.trim().toLowerCase(),
    name: (payload.name || payload.email.split("@")[0]).trim(),
    picture: payload.picture || "",
  };
};

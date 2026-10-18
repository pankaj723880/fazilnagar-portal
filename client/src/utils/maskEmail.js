// Mask email utility (ra****@gmail.com)
export function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}****@${domain}`;
  }
  return `${local.slice(0, 2)}****@${domain}`;
}

export default maskEmail;

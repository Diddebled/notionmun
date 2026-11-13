// Optional frontend owner hint for a deployment's own verified accounts.
// A privileged backend must independently verify identity and authorization.
export const OWNER_EMAILS = (import.meta.env.VITE_OWNER_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);

export function isOwner(user) {
  return Boolean(user?.emailVerified && OWNER_EMAILS.includes(user.email?.toLowerCase()));
}

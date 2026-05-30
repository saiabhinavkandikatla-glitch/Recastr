import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(encrypted: string): string {
  if (!encrypted) return "";

  const parts = encrypted.split(":");
  if (parts[0] !== "v1" || parts.length !== 4) {
    throw new Error("Invalid encrypted token format");
  }

  const [, ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey() {
  const configured = env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (configured && /^[a-f0-9]{64}$/i.test(configured)) {
    return Buffer.from(configured, "hex");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY must be a 64-character hex string");
  }

  return createHash("sha256").update("recastr-local-development-social-token-key").digest();
}

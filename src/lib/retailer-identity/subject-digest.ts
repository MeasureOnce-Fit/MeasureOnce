import { createHmac } from "node:crypto";

export function digestRetailerSubject(subject: string, secret: Uint8Array): Uint8Array {
  return createHmac("sha256", secret).update(subject, "utf8").digest();
}

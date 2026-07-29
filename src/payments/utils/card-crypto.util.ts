// src/payments/utils/card-crypto.util.ts
//
// Symmetric encryption for saved card numbers at rest. Same trust model
// as the rest of this payments module: this is a test-mode gateway with
// no real money movement, but we still avoid storing card numbers in
// plaintext, and — as everywhere else in this codebase — the CVV is
// never persisted at all, encrypted or not.
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  // In production this must come from a real secret manager. Falls back
  // to a fixed dev key (clearly labeled) so local development doesn't
  // require extra setup — mirrors the pattern already used by
  // CARD_PAYMENT_TOKEN_SECRET elsewhere in this module.
  const secret = process.env.CARD_VAULT_SECRET ?? 'dev-only-card-vault-secret-32b!!';
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes for AES-256
}

export function encryptCardNumber(digits: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(digits, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptCardNumber(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed saved-card ciphertext.');
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64url');
  const authTag = Buffer.from(tagB64, 'base64url');
  const encrypted = Buffer.from(dataB64, 'base64url');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

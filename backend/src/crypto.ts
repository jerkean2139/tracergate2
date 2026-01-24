import crypto from 'node:crypto';

function getKey(): Buffer {
  const keyB64 = process.env.APP_ENC_KEY_B64;
  if (!keyB64) {
    throw new Error('Missing APP_ENC_KEY_B64 (32-byte base64 key)');
  }
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error('APP_ENC_KEY_B64 must decode to 32 bytes');
  }
  return key;
}

export function encryptString(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptString(encB64: string): string {
  const key = getKey();
  const buf = Buffer.from(encB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

export function verifyAcceptBlueSignature(opts: {
  signatureHeader: string | undefined;
  signatureKey: string;
  rawBody: Buffer;
}): boolean {
  if (!opts.signatureHeader) return false;
  const computed = crypto
    .createHmac('sha256', opts.signatureKey)
    .update(opts.rawBody)
    .digest('hex');
  return computed === opts.signatureHeader;
}

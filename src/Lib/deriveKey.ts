import * as crypto from 'crypto';

export default function deriveKey(plaintext: string, salt: Buffer, iterations: number) {
  return new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(plaintext, salt, iterations, 512, 'sha512', (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey)));
}

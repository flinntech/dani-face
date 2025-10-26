/**
 * Encryption Service for secure storage of sensitive data
 * Uses AES-256-GCM encryption
 */

import crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

  constructor(encryptionKey?: string) {
    // Get encryption key from parameter or environment variable
    const keyString = encryptionKey || process.env.ENCRYPTION_KEY;

    if (!keyString) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Decode base64 encryption key (must be 32 bytes for AES-256)
    try {
      this.encryptionKey = Buffer.from(keyString, 'base64');
      if (this.encryptionKey.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (256 bits)');
      }
    } catch (error) {
      throw new Error('Invalid ENCRYPTION_KEY format. Must be base64-encoded 32-byte key');
    }
  }

  /**
   * Encrypt a plaintext string
   * @param plaintext - The text to encrypt
   * @returns Encrypted text in format: iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string');
    }

    // Generate random initialization vector (12 bytes recommended for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();

    // Return iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedText - Encrypted text in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext string
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new Error('Cannot decrypt empty string');
    }

    try {
      // Split the encrypted text into components
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }

      const [ivBase64, authTagBase64, ciphertext] = parts;

      // Decode components
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: Invalid encrypted text or wrong encryption key');
    }
  }

  /**
   * Generate a new random encryption key (for setup/testing)
   * @returns Base64-encoded 32-byte encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

// Create singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get the singleton EncryptionService instance
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

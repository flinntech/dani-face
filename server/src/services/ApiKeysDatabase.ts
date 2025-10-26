/**
 * API Keys Database Service
 * Manages encrypted storage and retrieval of user API keys for external services
 */

import { Database } from './Database';
import { EncryptionService } from './EncryptionService';

export type ServiceName = 'drm';

export interface ApiKeyData {
  id: string;
  userId: string;
  serviceName: ServiceName;
  apiKeyId: string;
  apiKeySecret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyCredentials {
  apiKeyId: string;
  apiKeySecret: string;
}

export class ApiKeysDatabase {
  private db: Database;
  private encryption: EncryptionService;

  constructor(db: Database, encryption: EncryptionService) {
    this.db = db;
    this.encryption = encryption;
  }

  /**
   * Set or update API key for a user and service
   */
  async setApiKey(
    userId: string,
    serviceName: ServiceName,
    apiKeyId: string,
    apiKeySecret: string
  ): Promise<void> {
    // Validate inputs
    if (!userId || !serviceName || !apiKeyId || !apiKeySecret) {
      throw new Error('All parameters are required');
    }

    // Encrypt the credentials
    const encryptedKeyId = this.encryption.encrypt(apiKeyId);
    const encryptedKeySecret = this.encryption.encrypt(apiKeySecret);

    // Insert or update (UPSERT)
    await this.db.query(
      `INSERT INTO user_api_keys (user_id, service_name, api_key_id, api_key_secret)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, service_name)
       DO UPDATE SET
         api_key_id = EXCLUDED.api_key_id,
         api_key_secret = EXCLUDED.api_key_secret,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, serviceName, encryptedKeyId, encryptedKeySecret]
    );

    console.log(`[ApiKeysDatabase] Saved API key for user ${userId}, service ${serviceName}`);
  }

  /**
   * Get decrypted API key credentials for a user and service
   */
  async getApiKey(userId: string, serviceName: ServiceName): Promise<ApiKeyCredentials | null> {
    const result = await this.db.queryOne<{
      api_key_id: string;
      api_key_secret: string;
    }>(
      `SELECT api_key_id, api_key_secret
       FROM user_api_keys
       WHERE user_id = $1 AND service_name = $2`,
      [userId, serviceName]
    );

    if (!result) {
      return null;
    }

    try {
      // Decrypt the credentials
      const apiKeyId = this.encryption.decrypt(result.api_key_id);
      const apiKeySecret = this.encryption.decrypt(result.api_key_secret);

      return {
        apiKeyId,
        apiKeySecret,
      };
    } catch (error) {
      console.error(`[ApiKeysDatabase] Failed to decrypt API key for user ${userId}:`, error);
      throw new Error('Failed to decrypt API credentials');
    }
  }

  /**
   * Check if user has API key configured for a service
   */
  async hasApiKey(userId: string, serviceName: ServiceName): Promise<boolean> {
    const result = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM user_api_keys
       WHERE user_id = $1 AND service_name = $2`,
      [userId, serviceName]
    );

    return result ? parseInt(result.count) > 0 : false;
  }

  /**
   * Delete API key for a user and service
   */
  async deleteApiKey(userId: string, serviceName: ServiceName): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM user_api_keys
       WHERE user_id = $1 AND service_name = $2`,
      [userId, serviceName]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      console.log(`[ApiKeysDatabase] Deleted API key for user ${userId}, service ${serviceName}`);
    }

    return deleted;
  }

  /**
   * Get all services for which user has API keys configured
   */
  async getUserServices(userId: string): Promise<ServiceName[]> {
    const results = await this.db.queryMany<{ service_name: ServiceName }>(
      `SELECT service_name
       FROM user_api_keys
       WHERE user_id = $1
       ORDER BY service_name`,
      [userId]
    );

    return results.map((r: { service_name: ServiceName }) => r.service_name);
  }

  /**
   * Get full API key data (with encrypted credentials) for a user
   * Useful for admin purposes or debugging
   */
  async getApiKeyData(userId: string, serviceName: ServiceName): Promise<ApiKeyData | null> {
    const result = await this.db.queryOne<{
      id: string;
      user_id: string;
      service_name: ServiceName;
      api_key_id: string;
      api_key_secret: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, user_id, service_name, api_key_id, api_key_secret, created_at, updated_at
       FROM user_api_keys
       WHERE user_id = $1 AND service_name = $2`,
      [userId, serviceName]
    );

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      userId: result.user_id,
      serviceName: result.service_name,
      apiKeyId: result.api_key_id, // Still encrypted
      apiKeySecret: result.api_key_secret, // Still encrypted
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }
}

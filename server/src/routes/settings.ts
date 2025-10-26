/**
 * Settings API Routes
 * Manages user settings including API keys for external services
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { ApiKeysDatabase, ServiceName } from '../services/ApiKeysDatabase';
import { getEncryptionService } from '../services/EncryptionService';
import { Database } from '../services/Database';
import {
  ApiKeyRequest,
  ApiKeyResponse,
  UserServicesResponse,
  SuccessResponse,
} from '../types/settings.types';

const router = Router();

// Get singleton database instance
const db = Database.getInstance();
const encryption = getEncryptionService();
const apiKeysDb = new ApiKeysDatabase(db, encryption);

/**
 * GET /api/settings/api-keys
 * Get all configured API keys for the current user
 */
router.get('/api-keys', requireAuth, async (req: AuthRequest, res: Response<UserServicesResponse>) => {
  try {
    const userId = req.user!.userId;

    // Get all services for which user has keys
    const configuredServices = await apiKeysDb.getUserServices(userId);

    // Build response
    const services: UserServicesResponse['services'] = {};

    // Check DRM service
    if (configuredServices.includes('drm')) {
      const data = await apiKeysDb.getApiKeyData(userId, 'drm');
      services.drm = {
        configured: true,
        createdAt: data?.createdAt.toISOString(),
        updatedAt: data?.updatedAt.toISOString(),
      };
    } else {
      services.drm = { configured: false };
    }

    res.json({ services });
  } catch (error) {
    console.error('[Settings] Error fetching API keys:', error);
    res.status(500).json({
      services: {},
    });
  }
});

/**
 * POST /api/settings/api-keys/drm
 * Save or update DRM API credentials
 */
router.post(
  '/api-keys/drm',
  requireAuth,
  [
    body('apiKeyId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('API Key ID is required')
      .isLength({ min: 10, max: 200 })
      .withMessage('Invalid API Key ID format'),
    body('apiKeySecret')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('API Key Secret is required')
      .isLength({ min: 10, max: 200 })
      .withMessage('Invalid API Key Secret format'),
  ],
  async (req: AuthRequest, res: Response<SuccessResponse>) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    try {
      const userId = req.user!.userId;
      const { apiKeyId, apiKeySecret } = req.body as ApiKeyRequest;

      // Save encrypted credentials
      await apiKeysDb.setApiKey(userId, 'drm', apiKeyId, apiKeySecret);

      console.log(`[Settings] DRM API key saved for user ${userId}`);

      res.json({
        success: true,
        message: 'DRM API credentials saved successfully',
      });
    } catch (error) {
      console.error('[Settings] Error saving DRM API key:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save DRM API credentials',
      });
    }
  }
);

/**
 * DELETE /api/settings/api-keys/drm
 * Delete DRM API credentials
 */
router.delete('/api-keys/drm', requireAuth, async (req: AuthRequest, res: Response<SuccessResponse>) => {
  try {
    const userId = req.user!.userId;

    const deleted = await apiKeysDb.deleteApiKey(userId, 'drm');

    if (deleted) {
      console.log(`[Settings] DRM API key deleted for user ${userId}`);
      res.json({
        success: true,
        message: 'DRM API credentials deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No DRM API credentials found to delete',
      });
    }
  } catch (error) {
    console.error('[Settings] Error deleting DRM API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete DRM API credentials',
    });
  }
});

/**
 * GET /api/settings/api-keys/drm
 * Check if DRM API key is configured (does not return actual keys)
 */
router.get('/api-keys/drm', requireAuth, async (req: AuthRequest, res: Response<ApiKeyResponse>) => {
  try {
    const userId = req.user!.userId;

    const hasKey = await apiKeysDb.hasApiKey(userId, 'drm');

    if (hasKey) {
      const data = await apiKeysDb.getApiKeyData(userId, 'drm');
      res.json({
        serviceName: 'drm',
        configured: true,
        createdAt: data?.createdAt.toISOString(),
        updatedAt: data?.updatedAt.toISOString(),
      });
    } else {
      res.json({
        serviceName: 'drm',
        configured: false,
      });
    }
  } catch (error) {
    console.error('[Settings] Error checking DRM API key:', error);
    res.status(500).json({
      serviceName: 'drm',
      configured: false,
    });
  }
});

export default router;

/**
 * Migration Registry
 * Imports and exports all database migrations
 */

import { migration003 } from './003-admin-system';
import { migration004 } from './004-conversation-logging';

// Export all migrations in order
export const migrations = [
  migration003,
  migration004,
];

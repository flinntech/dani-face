/**
 * Migration Registry
 * Imports and exports all database migrations
 */

import { migration003 } from './003-admin-system';

// Export all migrations in order
export const migrations = [
  migration003,
];

/**
 * Migration 003: Admin System
 * Adds role-based access control and admin functionality
 */

import { Migration } from '../services/MigrationService';
import { Database } from '../services/Database';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const INITIAL_ADMIN_EMAIL = 'jflinn@digi.com';
const INITIAL_ADMIN_NAME = 'James Flinn';
const INITIAL_ADMIN_PASSWORD = 'ChangeMe123!'; // Should be changed on first login

export const migration003: Migration = {
  id: 3,
  name: 'admin-system',

  up: async (db: Database): Promise<void> => {
    console.log('  → Creating user_role enum type...');

    // Create enum type for user roles
    await db.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('pending', 'user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('  → Adding role column to users table...');

    // Add role column to users table (with default 'user' for existing users)
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user' NOT NULL;
    `);

    // Update existing users to 'user' role if they don't have one
    await db.query(`
      UPDATE users
      SET role = 'user'
      WHERE role IS NULL;
    `);

    // Change default for new signups to 'pending'
    await db.query(`
      ALTER TABLE users
      ALTER COLUMN role SET DEFAULT 'pending';
    `);

    console.log('  → Creating admin_action_logs table...');

    // Create admin action logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_action_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('  → Creating indexes for admin system...');

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_action_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_action_logs(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_action_logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_action_logs(created_at);
    `);

    console.log('  → Setting up initial admin user...');

    // Check if initial admin exists
    const existingAdmin = await db.queryOne<{ id: string; role: string }>(
      'SELECT id, role FROM users WHERE email = $1',
      [INITIAL_ADMIN_EMAIL]
    );

    if (existingAdmin) {
      // User exists, update to admin role
      await db.query(
        'UPDATE users SET role = $1 WHERE email = $2',
        ['admin', INITIAL_ADMIN_EMAIL]
      );
      console.log(`  ✅ Updated ${INITIAL_ADMIN_EMAIL} to admin role`);
    } else {
      // User doesn't exist, create admin account
      const passwordHash = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, SALT_ROUNDS);
      await db.query(
        `INSERT INTO users (id, email, password_hash, name, role, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [INITIAL_ADMIN_EMAIL, passwordHash, INITIAL_ADMIN_NAME, 'admin']
      );
      console.log(`  ✅ Created initial admin account: ${INITIAL_ADMIN_EMAIL}`);
      console.log(`  ⚠️  Default password: ${INITIAL_ADMIN_PASSWORD} - PLEASE CHANGE ON FIRST LOGIN`);
    }

    console.log('  ✅ Admin system migration completed');
  },

  down: async (db: Database): Promise<void> => {
    console.log('  → Rolling back admin system...');

    // Drop indexes
    await db.query(`
      DROP INDEX IF EXISTS idx_admin_logs_created_at;
      DROP INDEX IF EXISTS idx_admin_logs_action_type;
      DROP INDEX IF EXISTS idx_admin_logs_target_user_id;
      DROP INDEX IF EXISTS idx_admin_logs_admin_id;
      DROP INDEX IF EXISTS idx_users_role;
    `);

    // Drop admin action logs table
    await db.query('DROP TABLE IF EXISTS admin_action_logs;');

    // Remove role column from users
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS role;');

    // Drop enum type
    await db.query('DROP TYPE IF EXISTS user_role;');

    console.log('  ✅ Admin system rollback completed');
  },
};

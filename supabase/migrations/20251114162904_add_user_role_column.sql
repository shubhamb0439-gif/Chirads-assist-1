/*
  # Add User Role Column

  1. Changes
    - Add role column to users table to distinguish between patient, provider, and scribe
    - Create a custom type for roles
    - Set default role as 'patient' for existing users
  
  2. Security
    - No RLS changes needed (users table already has policies)
*/

-- Create enum type for user roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'provider', 'scribe');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'user_role'
  ) THEN
    ALTER TABLE users ADD COLUMN user_role user_role DEFAULT 'patient';
  END IF;
END $$;

-- Update existing users to have patient role by default
UPDATE users SET user_role = 'patient' WHERE user_role IS NULL;

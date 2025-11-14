/*
  # Add Provider Login Credentials

  1. Changes
    - Add `email` column to providers table (text, unique, nullable initially)
    - Add `password` column to providers table (text, nullable)
    - Populate provider emails by removing spaces from names and appending @gmail.com
    - Handle duplicates by appending row numbers to make emails unique
    - Set all provider passwords to NULL initially

  2. Security
    - Provider login will be handled through the same authentication flow as users
*/

-- Add email and password columns to providers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'email'
  ) THEN
    ALTER TABLE providers ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'password'
  ) THEN
    ALTER TABLE providers ADD COLUMN password text;
  END IF;
END $$;

-- Populate provider emails with unique values
WITH numbered_providers AS (
  SELECT 
    id,
    LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), ',', ''), '.', '')) as base_email,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), ',', ''), '.', ''))
      ORDER BY created_at, id
    ) as rn
  FROM providers
  WHERE email IS NULL
)
UPDATE providers p
SET email = CASE 
  WHEN np.rn = 1 THEN np.base_email || '@gmail.com'
  ELSE np.base_email || np.rn || '@gmail.com'
END
FROM numbered_providers np
WHERE p.id = np.id;

-- Add unique constraint after populating emails
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'providers_email_key'
  ) THEN
    ALTER TABLE providers ADD CONSTRAINT providers_email_key UNIQUE (email);
  END IF;
END $$;

-- Ensure all provider passwords are NULL initially
UPDATE providers SET password = NULL WHERE password IS NOT NULL;

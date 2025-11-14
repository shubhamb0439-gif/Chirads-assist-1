/*
  # Allow Anonymous User Insert

  Temporarily allow anon users to insert into users table for account creation.

  ## Changes Made

  1. **Add INSERT policy for anon users**
     - Allows account creation without authentication
     - Will be used temporarily for user creation

  ## Security Note
  - This is a temporary policy for initial user setup
  - Should be reviewed and potentially removed after migration
*/

-- Add temporary INSERT policy for anon users
CREATE POLICY "Allow anon insert for initial setup"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);
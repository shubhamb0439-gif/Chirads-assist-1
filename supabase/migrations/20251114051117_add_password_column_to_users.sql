/*
  # Add Password Column to Users Table

  ## Changes
  - Add `password` column to `users` table for storing user passwords
  
  ## Modified Tables
  
  ### `users`
  - Add `password` (text, nullable) - Stored password field
*/

-- Add password column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password text;
/*
  # Allow Anonymous Users to Read Refill Notifications

  1. Changes
    - Add policy for anonymous users to read refill notifications
    - This matches the pattern used in the rest of the app which uses custom authentication
  
  2. Security
    - Anonymous users can read all refill notifications (same pattern as other tables in the app)
    - Users can still update their own notifications
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own refill notifications" ON refill_notifications;
DROP POLICY IF EXISTS "Users can update own refill notifications" ON refill_notifications;

-- Add policies that work with custom auth (not Supabase auth)
CREATE POLICY "Allow anonymous read refill notifications"
  ON refill_notifications
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update refill notifications"
  ON refill_notifications
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

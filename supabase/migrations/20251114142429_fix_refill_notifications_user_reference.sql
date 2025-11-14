/*
  # Fix Refill Notifications User Reference

  1. Changes
    - Drop existing refill_notifications table
    - Recreate with correct user_id reference to users table (not auth.users)
    - Recreate all policies and function
  
  2. Security
    - Enable RLS with proper policies
    - System can insert notifications
    - Users can read and update their own notifications
*/

-- Drop existing objects
DROP POLICY IF EXISTS "System can insert refill notifications" ON refill_notifications;
DROP POLICY IF EXISTS "Users can update own refill notifications" ON refill_notifications;
DROP POLICY IF EXISTS "Users can read own refill notifications" ON refill_notifications;
DROP FUNCTION IF EXISTS check_and_notify_refill_dates();
DROP TABLE IF EXISTS refill_notifications;

-- Recreate table with correct reference
CREATE TABLE refill_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  drug_id uuid REFERENCES drugs(id) ON DELETE CASCADE NOT NULL,
  refill_date date NOT NULL,
  days_remaining integer NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE refill_notifications ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can read own refill notifications"
  ON refill_notifications
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Users can update own refill notifications"
  ON refill_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "System can insert refill notifications"
  ON refill_notifications
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE refill_notifications;

-- Recreate function
CREATE OR REPLACE FUNCTION check_and_notify_refill_dates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO refill_notifications (user_id, drug_id, refill_date, days_remaining)
  SELECT 
    pd.user_id,
    pd.drug_id,
    pd.refill_date,
    (pd.refill_date - CURRENT_DATE) as days_remaining
  FROM patient_drugs pd
  WHERE pd.refill_date IS NOT NULL
    AND pd.refill_date >= CURRENT_DATE
    AND (pd.refill_date - CURRENT_DATE) <= 5
    AND NOT EXISTS (
      SELECT 1 
      FROM refill_notifications rn 
      WHERE rn.user_id = pd.user_id 
        AND rn.drug_id = pd.drug_id
        AND rn.refill_date = pd.refill_date
        AND DATE(rn.created_at) = CURRENT_DATE
    );
END;
$$;

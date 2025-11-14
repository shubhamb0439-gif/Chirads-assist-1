/*
  # Create Refill Notifications System

  1. New Tables
    - `refill_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `drug_id` (uuid, references drugs)
      - `refill_date` (date)
      - `days_remaining` (integer)
      - `is_read` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `refill_notifications` table
    - Add policy for users to read their own notifications

  3. Function
    - Create function to check refill dates and create notifications
    - This function checks if refill date is within 5 days and creates daily notifications
*/

CREATE TABLE IF NOT EXISTS refill_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  drug_id uuid REFERENCES drugs(id) ON DELETE CASCADE NOT NULL,
  refill_date date NOT NULL,
  days_remaining integer NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE refill_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own refill notifications"
  ON refill_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own refill notifications"
  ON refill_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

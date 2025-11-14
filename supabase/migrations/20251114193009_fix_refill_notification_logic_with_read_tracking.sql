/*
  # Fix Refill Notification Logic

  1. Changes
    - Update check_and_notify_refill_dates() function
    - Only prevent duplicate notifications if an UNREAD notification already exists
    - This allows users to receive new notifications on each login after marking as read
    - Removes the date-based duplicate check (was preventing multiple notifications per day)

  2. Logic
    - Create notification when refill_date is within 7 days
    - Only skip if there's an UNREAD notification for the same drug and refill date
    - Users can dismiss and receive notifications again on next login
*/

CREATE OR REPLACE FUNCTION check_and_notify_refill_dates()
RETURNS void AS $$
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
    AND (pd.refill_date - CURRENT_DATE) <= 7
    AND NOT EXISTS (
      -- Only skip if an unread notification already exists for this drug and refill date
      SELECT 1 
      FROM refill_notifications rn 
      WHERE rn.user_id = pd.user_id 
        AND rn.drug_id = pd.drug_id
        AND rn.refill_date = pd.refill_date
        AND rn.is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

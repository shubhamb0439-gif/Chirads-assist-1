/*
  # Revert Refill Notifications to Patient Only

  1. Changes
    - Revert check_and_notify_refill_dates() function
    - Create refill notifications ONLY for patients about their own drugs
    - Scribes will see notifications when they select a patient (frontend context)
    - Providers will see notifications when they select a patient (frontend context)

  2. Logic
    - For each patient_drug with upcoming refill (within 7 days):
      - Create notification for the patient (user_id) only
    - Only skip if there's an UNREAD notification for the same drug and refill date
*/

CREATE OR REPLACE FUNCTION check_and_notify_refill_dates()
RETURNS void AS $$
BEGIN
  -- Create notifications for patients about their own drugs
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
      SELECT 1 
      FROM refill_notifications rn 
      WHERE rn.user_id = pd.user_id 
        AND rn.drug_id = pd.drug_id
        AND rn.refill_date = pd.refill_date
        AND rn.is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

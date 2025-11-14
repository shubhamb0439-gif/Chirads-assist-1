/*
  # Fix Re-Enrollment Notification Logic

  1. Changes
    - Update check_and_notify_re_enrollment_dates() function
    - Only prevent duplicate notifications if an UNREAD notification already exists
    - This allows users to receive new notifications on each login after marking previous ones as read

  2. Logic
    - Create notification when re_enrollment_date <= CURRENT_DATE
    - Only skip if there's an UNREAD notification for the same enrollment
    - Users can dismiss and receive notifications again on next login
*/

CREATE OR REPLACE FUNCTION check_and_notify_re_enrollment_dates()
RETURNS void AS $$
BEGIN
  -- Insert notifications for enrollments that have reached their re-enrollment date
  INSERT INTO program_notifications (user_id, program_id, old_status, new_status, message)
  SELECT DISTINCT
    e.user_id,
    e.program_id,
    'completed',
    'open',
    'Your enrollment in "' || p.name || '" has reached its re-enrollment date. You can now re-enroll in this program!'
  FROM enrollments e
  JOIN programs p ON p.id = e.program_id
  WHERE 
    e.status = 'completed'
    AND e.re_enrollment_date IS NOT NULL
    AND e.re_enrollment_date <= CURRENT_DATE
    AND NOT EXISTS (
      -- Don't create duplicate notifications if an unread one already exists
      SELECT 1 FROM program_notifications pn
      WHERE pn.user_id = e.user_id
        AND pn.program_id = e.program_id
        AND pn.new_status = 'open'
        AND pn.old_status = 'completed'
        AND pn.is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
  # Create Re-Enrollment Date Notifications System

  1. Overview
    - Creates a function to check for enrollments reaching their re-enrollment date
    - Generates notifications for users when their re-enrollment date arrives
    - Can be called periodically or triggered by application logic

  2. New Function
    - `check_and_notify_re_enrollment_dates()` - Checks enrollments table for re-enrollment dates that have arrived
    - Creates notifications in program_notifications table for affected users

  3. Notification Logic
    - Checks if re_enrollment_date is today or in the past
    - Only notifies for 'completed' status enrollments
    - Only creates notification if one doesn't already exist for this enrollment

  4. Security
    - No RLS changes needed - uses existing program_notifications policies
*/

-- Create function to check for re-enrollment dates and notify users
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
      -- Don't create duplicate notifications for the same enrollment
      SELECT 1 FROM program_notifications pn
      WHERE pn.user_id = e.user_id
        AND pn.program_id = e.program_id
        AND pn.new_status = 'open'
        AND pn.old_status = 'completed'
        AND pn.created_at > e.re_enrollment_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a trigger that runs when enrollments are queried or updated
-- This ensures we check for re-enrollment notifications when users access the app
CREATE OR REPLACE FUNCTION trigger_re_enrollment_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the check function (runs in background)
  PERFORM check_and_notify_re_enrollment_dates();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on enrollments table for completed status
DROP TRIGGER IF EXISTS check_re_enrollment_on_completion ON enrollments;
CREATE TRIGGER check_re_enrollment_on_completion
  AFTER UPDATE ON enrollments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND NEW.re_enrollment_date IS NOT NULL)
  EXECUTE FUNCTION trigger_re_enrollment_check();

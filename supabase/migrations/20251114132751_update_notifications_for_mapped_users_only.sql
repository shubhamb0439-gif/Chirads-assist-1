/*
  # Update notifications for mapped users only

  1. Changes
    - Update trigger to create notifications only for users mapped to the program in patient_programs
    - Add enrollment_link to notification table for quick access

  2. Reasoning
    - Only users who have been mapped to a program should receive notifications
    - Store the enrollment link in the notification for easy access
*/

-- Add enrollment_link column to program_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'program_notifications' AND column_name = 'enrollment_link'
  ) THEN
    ALTER TABLE program_notifications ADD COLUMN enrollment_link text;
  END IF;
END $$;

-- Update the function to notify only mapped users and include enrollment link
CREATE OR REPLACE FUNCTION notify_users_of_program_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status actually changed
  IF OLD.program_status IS DISTINCT FROM NEW.program_status THEN
    -- Insert notification for users mapped to this program in patient_programs
    INSERT INTO program_notifications (user_id, program_id, old_status, new_status, message, enrollment_link)
    SELECT 
      pp.user_id,
      NEW.id,
      OLD.program_status,
      NEW.program_status,
      CASE 
        WHEN NEW.program_status = 'open' THEN 'The program "' || NEW.name || '" is now open for enrollment!'
        WHEN NEW.program_status = 'closed' THEN 'The program "' || NEW.name || '" has been closed.'
        WHEN NEW.program_status = 'waitlisted' THEN 'The program "' || NEW.name || '" is now accepting waitlist applications.'
        WHEN NEW.program_status = 'identified' THEN 'The program "' || NEW.name || '" has been identified.'
        ELSE 'The program "' || NEW.name || '" status has been updated to ' || NEW.program_status
      END,
      NEW.enrollment_link
    FROM patient_programs pp
    WHERE pp.program_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
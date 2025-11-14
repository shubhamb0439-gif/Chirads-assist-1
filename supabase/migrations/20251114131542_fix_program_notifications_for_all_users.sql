/*
  # Fix program notifications for all users

  1. Changes
    - Update trigger function to create notifications for ALL users, not just enrolled ones
    - When a program status changes, all users in the system should be notified

  2. Reasoning
    - Users need to know when programs become available (open)
    - Even non-enrolled users should see notifications about program status changes
*/

-- Drop and recreate the function to notify ALL users
CREATE OR REPLACE FUNCTION notify_users_of_program_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status actually changed
  IF OLD.program_status IS DISTINCT FROM NEW.program_status THEN
    -- Insert notification for ALL users in the system
    INSERT INTO program_notifications (user_id, program_id, old_status, new_status, message)
    SELECT 
      u.id,
      NEW.id,
      OLD.program_status,
      NEW.program_status,
      CASE 
        WHEN NEW.program_status = 'open' THEN 'The program "' || NEW.name || '" is now open for enrollment!'
        WHEN NEW.program_status = 'closed' THEN 'The program "' || NEW.name || '" has been closed.'
        WHEN NEW.program_status = 'waitlisted' THEN 'The program "' || NEW.name || '" is now accepting waitlist applications.'
        WHEN NEW.program_status = 'identified' THEN 'The program "' || NEW.name || '" has been identified.'
        ELSE 'The program "' || NEW.name || '" status has been updated to ' || NEW.program_status
      END
    FROM users u;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
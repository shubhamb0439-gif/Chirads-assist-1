/*
  # Update trigger for all program status changes

  1. Changes
    - Update `notify_program_status_change()` function to handle ALL status changes
    - Previously only notified when status changed to 'open'
    - Now notifies for any status change: open, closed, waitlisted, identified

  2. Notification Messages
    - Open: "Program Now Open! [name] is now open for enrollment."
    - Closed: "Program Closed - [name] is now closed."
    - Waitlisted: "Program Waitlisted - [name] is now waitlisted."
    - Identified: "Program Identified - [name] has been identified for you."

  Note: This migration updates the trigger to detect ALL program status changes
  and send appropriate notifications to users via push notifications.
*/

CREATE OR REPLACE FUNCTION notify_program_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Check if program_status actually changed
  IF OLD.program_status IS DISTINCT FROM NEW.program_status THEN
    -- Set notification message based on new status
    CASE NEW.program_status
      WHEN 'open' THEN
        notification_title := 'Program Now Open!';
        notification_body := NEW.name || ' is now open for enrollment.';
      WHEN 'closed' THEN
        notification_title := 'Program Closed';
        notification_body := NEW.name || ' is now closed.';
      WHEN 'waitlisted' THEN
        notification_title := 'Program Waitlisted';
        notification_body := NEW.name || ' is now waitlisted.';
      WHEN 'identified' THEN
        notification_title := 'Program Identified';
        notification_body := NEW.name || ' has been identified for you.';
      ELSE
        notification_title := 'Program Status Updated';
        notification_body := NEW.name || ' status has been updated.';
    END CASE;

    -- Send notification to all users associated with this program
    FOR user_record IN
      SELECT DISTINCT pp.user_id
      FROM patient_programs pp
      WHERE pp.program_id = NEW.id
    LOOP
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'userId', user_record.user_id,
          'notification', jsonb_build_object(
            'title', notification_title,
            'body', notification_body,
            'tag', 'program_' || NEW.id || '_' || NEW.program_status,
            'url', '/'
          )
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (it already exists, but this ensures it uses the updated function)
DROP TRIGGER IF EXISTS program_status_change_trigger ON programs;

CREATE TRIGGER program_status_change_trigger
  AFTER UPDATE ON programs
  FOR EACH ROW
  WHEN (OLD.program_status IS DISTINCT FROM NEW.program_status)
  EXECUTE FUNCTION notify_program_status_change();

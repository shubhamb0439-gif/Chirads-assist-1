/*
  # Create trigger for program status changes

  1. New Functions
    - `notify_program_status_change()` - Triggers when program status changes from closed/waitlisted to open

  2. Triggers
    - Calls edge function to send push notifications to all users enrolled in the program

  Note: This migration creates a trigger that detects program status changes.
  When a program changes from 'closed' or 'waitlisted' to 'open', it will attempt to
  notify users via push notifications through the edge function.
*/

CREATE OR REPLACE FUNCTION notify_program_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  IF (OLD.program_status IN ('closed', 'waitlisted') AND NEW.program_status = 'open') THEN
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
            'title', 'Program Now Open!',
            'body', NEW.name || ' is now open for enrollment.',
            'tag', 'program_' || NEW.id,
            'url', '/'
          )
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS program_status_change_trigger ON programs;

CREATE TRIGGER program_status_change_trigger
  AFTER UPDATE ON programs
  FOR EACH ROW
  WHEN (OLD.program_status IS DISTINCT FROM NEW.program_status)
  EXECUTE FUNCTION notify_program_status_change();

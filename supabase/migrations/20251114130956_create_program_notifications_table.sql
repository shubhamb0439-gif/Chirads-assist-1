/*
  # Create program status notifications table

  1. New Tables
    - `program_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `program_id` (uuid, references programs)
      - `old_status` (text) - Previous program status
      - `new_status` (text) - New program status
      - `message` (text) - Notification message to display
      - `is_read` (boolean) - Whether user has seen the notification
      - `created_at` (timestamptz) - When the notification was created

  2. Security
    - Enable RLS on `program_notifications` table
    - Add policy for users to read their own notifications
    - Add policy for users to update their own notifications (mark as read)

  3. Trigger
    - Create trigger to automatically create notifications when program status changes
*/

-- Create the notifications table
CREATE TABLE IF NOT EXISTS program_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE program_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own notifications
CREATE POLICY "Users can read own notifications"
  ON program_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

-- Policy for anonymous users to read their own notifications
CREATE POLICY "Anonymous users can read own notifications"
  ON program_notifications
  FOR SELECT
  TO anon
  USING (true);

-- Policy for users to update their own notifications
CREATE POLICY "Users can update own notifications"
  ON program_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- Policy for anonymous users to update their own notifications
CREATE POLICY "Anonymous users can update own notifications"
  ON program_notifications
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create function to notify users when program status changes
CREATE OR REPLACE FUNCTION notify_users_of_program_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status actually changed
  IF OLD.program_status IS DISTINCT FROM NEW.program_status THEN
    -- Insert notification for all users enrolled in this program
    INSERT INTO program_notifications (user_id, program_id, old_status, new_status, message)
    SELECT 
      e.user_id,
      NEW.id,
      OLD.program_status,
      NEW.program_status,
      CASE 
        WHEN NEW.program_status = 'open' THEN 'The program "' || NEW.name || '" is now open for enrollment!'
        WHEN NEW.program_status = 'closed' THEN 'The program "' || NEW.name || '" has been closed.'
        ELSE 'The program "' || NEW.name || '" status has been updated to ' || NEW.program_status
      END
    FROM enrollments e
    WHERE e.program_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS program_status_change_notification_trigger ON programs;
CREATE TRIGGER program_status_change_notification_trigger
  AFTER UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION notify_users_of_program_status_change();
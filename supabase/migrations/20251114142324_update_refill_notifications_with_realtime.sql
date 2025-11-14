/*
  # Update Refill Notifications System

  1. Changes
    - Add policy for inserting refill notifications (for function execution)
    - Enable realtime for refill_notifications table
    - Update function to properly reference drug information
  
  2. Security
    - Add insert policy for system-generated notifications
    - Maintain existing read and update policies for users
*/

-- Add insert policy for system function
CREATE POLICY "System can insert refill notifications"
  ON refill_notifications
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime updates for the table
ALTER PUBLICATION supabase_realtime ADD TABLE refill_notifications;

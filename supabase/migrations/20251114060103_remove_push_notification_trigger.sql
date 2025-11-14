/*
  # Remove push notification trigger
  
  1. Changes
    - Drop the trigger that attempts to send push notifications
    - Drop the associated function
  
  2. Reasoning
    - The trigger requires pg_net extension and custom settings
    - Push notifications should be handled in application code
    - This removes the error when updating program status
*/

DROP TRIGGER IF EXISTS program_status_change_trigger ON programs;
DROP FUNCTION IF EXISTS notify_program_status_change();

/*
  # Fix Re-Enrollment Date Trigger to Handle Program Changes

  1. Changes
    - Update the trigger condition to fire on any UPDATE (not just specific columns)
    - This ensures re-enrollment date is recalculated when program renewal_period changes
    
  2. Logic
    - The trigger will now fire whenever an enrollment is updated
    - This includes when the program_change trigger updates updated_at
    - Re-enrollment date will be recalculated based on current program renewal_period
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS set_re_enrollment_date_on_update ON enrollments;

-- Recreate trigger without the WHEN clause to fire on all updates
CREATE TRIGGER set_re_enrollment_date_on_update
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_re_enrollment_date();

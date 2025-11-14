/*
  # Update Enrollments When Program Renewal Period Changes

  1. Overview
    - Creates a trigger to recalculate re-enrollment dates for all enrollments
    - Runs when a program's renewal_period is updated
    
  2. Function
    - Updates all enrollments associated with the changed program
    - Forces recalculation by updating the updated_at timestamp
    
  3. Trigger
    - AFTER UPDATE on programs table
    - Only fires when renewal_period changes
*/

-- Create function to update enrollments when program renewal period changes
CREATE OR REPLACE FUNCTION update_enrollments_on_program_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all enrollments for this program to trigger re-enrollment date recalculation
  UPDATE enrollments
  SET updated_at = NOW()
  WHERE program_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on programs table
CREATE TRIGGER recalculate_enrollments_on_renewal_change
  AFTER UPDATE ON programs
  FOR EACH ROW
  WHEN (OLD.renewal_period IS DISTINCT FROM NEW.renewal_period)
  EXECUTE FUNCTION update_enrollments_on_program_change();

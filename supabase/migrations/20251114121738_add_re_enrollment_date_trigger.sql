/*
  # Add Re-Enrollment Date Trigger

  1. Overview
    - Creates a function to automatically calculate re-enrollment dates
    - Sets up triggers to populate re_enrollment_date on insert and update
    
  2. Logic
    - If renewal_period is 'never': re_enrollment_date = NULL
    - If renewal_period is 'calendar year' or 'calendar years': re_enrollment_date = January 1st of next year
    - If renewal_period is a number (days): re_enrollment_date = enrolled_at + number of days
    
  3. Triggers
    - BEFORE INSERT: Calculate re_enrollment_date when new enrollment is created
    - BEFORE UPDATE: Recalculate re_enrollment_date when completion_date or enrolled_at changes
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS calculate_re_enrollment_date() CASCADE;

-- Create function to calculate re-enrollment date
CREATE OR REPLACE FUNCTION calculate_re_enrollment_date()
RETURNS TRIGGER AS $$
DECLARE
  renewal_period_value TEXT;
  base_date DATE;
  days_to_add INTEGER;
  next_year INTEGER;
BEGIN
  -- Get the renewal period from the programs table
  SELECT renewal_period INTO renewal_period_value
  FROM programs
  WHERE id = NEW.program_id;

  -- Determine base date (use completion_date if completed, otherwise enrolled_at)
  IF NEW.status = 'completed' AND NEW.completion_date IS NOT NULL THEN
    base_date := NEW.completion_date;
  ELSIF NEW.enrolled_at IS NOT NULL THEN
    base_date := NEW.enrolled_at::DATE;
  ELSE
    base_date := CURRENT_DATE;
  END IF;

  -- Calculate re-enrollment date based on renewal period
  IF renewal_period_value = 'never' THEN
    NEW.re_enrollment_date := NULL;
  ELSIF renewal_period_value IN ('calendar year', 'calendar years') THEN
    -- Set to January 1st of the next year
    next_year := EXTRACT(YEAR FROM base_date) + 1;
    NEW.re_enrollment_date := make_date(next_year, 1, 1);
  ELSE
    -- Try to parse as integer (number of days)
    BEGIN
      days_to_add := renewal_period_value::INTEGER;
      NEW.re_enrollment_date := base_date + days_to_add;
    EXCEPTION
      WHEN OTHERS THEN
        -- If parsing fails, set to NULL
        NEW.re_enrollment_date := NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
CREATE TRIGGER set_re_enrollment_date_on_insert
  BEFORE INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_re_enrollment_date();

-- Create trigger for UPDATE
CREATE TRIGGER set_re_enrollment_date_on_update
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  WHEN (
    OLD.completion_date IS DISTINCT FROM NEW.completion_date OR
    OLD.enrolled_at IS DISTINCT FROM NEW.enrolled_at OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION calculate_re_enrollment_date();

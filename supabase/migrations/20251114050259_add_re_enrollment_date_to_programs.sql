/*
  # Add Re-enrollment Date to Programs

  1. Changes
    - Add `re_enrollment_date` column to `programs` table
    - Set dummy re-enrollment dates for existing programs (30 days from now)

  2. Notes
    - Re-enrollment date represents when a patient should re-enroll in the program
    - This will be displayed on the calendar alongside refill dates
*/

-- Add re_enrollment_date column to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS re_enrollment_date date;

-- Set dummy re-enrollment dates for existing programs (30 days from now)
UPDATE programs 
SET re_enrollment_date = CURRENT_DATE + INTERVAL '30 days'
WHERE re_enrollment_date IS NULL;
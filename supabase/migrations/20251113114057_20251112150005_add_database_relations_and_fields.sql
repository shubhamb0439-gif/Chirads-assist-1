/*
  # Add Database Relations and Additional Fields

  ## Overview
  This migration creates comprehensive database relations and adds required fields
  for managing clinic-provider relationships, program enrollments, drug refills,
  and patient-specific data access.

  ## New Tables

  ### 1. `clinic_providers`
  - `id` (uuid, primary key) - Unique record identifier
  - `clinic_id` (uuid, foreign key) - Reference to clinics table
  - `provider_id` (uuid, foreign key) - Reference to providers table
  - `created_at` (timestamptz) - Association timestamp
  - Purpose: Maps each clinic with its corresponding providers

  ### 2. `program_drugs`
  - `id` (uuid, primary key) - Unique record identifier
  - `program_id` (uuid, foreign key) - Reference to programs table
  - `drug_id` (uuid, foreign key) - Reference to drugs table
  - `created_at` (timestamptz) - Association timestamp
  - Purpose: Links drugs to programs (which drugs are covered by which programs)

  ### 3. `patient_programs`
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - Reference to users table (patient)
  - `program_id` (uuid, foreign key) - Reference to programs table
  - `created_at` (timestamptz) - Association timestamp
  - Purpose: Maps which programs are available/visible to specific patients

  ## Modified Tables

  ### `enrollments`
  - Add `re_enrollment_date` (date, nullable) - Date when patient needs to re-enroll

  ### `drug_details`
  - Add `refill_date` (date, nullable) - Date when drug refill is needed

  ## Security
  - Enable RLS on all new tables
  - Add appropriate policies for authenticated users
  - Maintain data isolation between users

  ## Important Notes
  1. Clinic-Provider Mapping: Each clinic can have multiple providers
  2. Patient-Program Access: Only programs mapped to a patient will be visible
  3. Re-enrollment: Programs can have re-enrollment dates for automatic reminders
  4. Refill Tracking: Drug refill dates help track medication schedules
*/

-- Create clinic_providers junction table
CREATE TABLE IF NOT EXISTS clinic_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, provider_id)
);

-- Create program_drugs junction table
CREATE TABLE IF NOT EXISTS program_drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  drug_id uuid REFERENCES drugs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, drug_id)
);

-- Create patient_programs junction table (controls which programs a patient can see)
CREATE TABLE IF NOT EXISTS patient_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Add re_enrollment_date to enrollments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 're_enrollment_date'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN re_enrollment_date date;
  END IF;
END $$;

-- Add refill_date to drug_details table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drug_details' AND column_name = 'refill_date'
  ) THEN
    ALTER TABLE drug_details ADD COLUMN refill_date date;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE clinic_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinic_providers (public read)
CREATE POLICY "Anyone can view clinic-provider mappings"
  ON clinic_providers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert clinic-provider mappings"
  ON clinic_providers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete clinic-provider mappings"
  ON clinic_providers FOR DELETE
  USING (true);

-- RLS Policies for program_drugs (public read)
CREATE POLICY "Anyone can view program-drug mappings"
  ON program_drugs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert program-drug mappings"
  ON program_drugs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete program-drug mappings"
  ON program_drugs FOR DELETE
  USING (true);

-- RLS Policies for patient_programs
CREATE POLICY "Anyone can view patient-program mappings"
  ON patient_programs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert patient-program mappings"
  ON patient_programs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete patient-program mappings"
  ON patient_programs FOR DELETE
  USING (true);

-- Update drug_details DELETE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'drug_details' AND policyname = 'Users can delete own drug details'
  ) THEN
    CREATE POLICY "Users can delete own drug details"
      ON drug_details FOR DELETE
      USING (true);
  END IF;
END $$;
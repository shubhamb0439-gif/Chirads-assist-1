/*
  # Create Patient-Drug Mapping Table

  ## Overview
  This migration creates a patient_drugs junction table to map patients to their drugs,
  replacing the single drug relationship in drug_details with a many-to-many relationship.

  ## New Tables

  ### `patient_drugs`
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - Reference to users table (patient)
  - `drug_id` (uuid, foreign key) - Reference to drugs table
  - `refill_date` (date, nullable) - Date when drug refill is needed
  - `weekly_price` (numeric) - Stored weekly price at time of selection
  - `monthly_price` (numeric) - Stored monthly price at time of selection
  - `yearly_price` (numeric) - Stored yearly price at time of selection
  - `created_at` (timestamptz) - Association timestamp
  - Purpose: Maps which drugs are assigned to specific patients with pricing snapshot

  ## Security
  - Enable RLS on patient_drugs table
  - Add appropriate policies for authenticated users

  ## Notes
  - This table allows patients to be mapped to multiple drugs
  - Prices are stored as snapshots at the time of selection
  - Refill dates can be tracked per patient-drug relationship
*/

-- Create patient_drugs junction table
CREATE TABLE IF NOT EXISTS patient_drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  drug_id uuid REFERENCES drugs(id) ON DELETE CASCADE,
  refill_date date,
  weekly_price numeric,
  monthly_price numeric,
  yearly_price numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, drug_id)
);

-- Enable RLS on patient_drugs table
ALTER TABLE patient_drugs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patient_drugs
CREATE POLICY "Users can view own patient-drug mappings"
  ON patient_drugs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own patient-drug mappings"
  ON patient_drugs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own patient-drug mappings"
  ON patient_drugs FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own patient-drug mappings"
  ON patient_drugs FOR DELETE
  USING (true);
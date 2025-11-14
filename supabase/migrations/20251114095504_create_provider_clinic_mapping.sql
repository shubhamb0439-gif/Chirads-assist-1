/*
  # Create Provider-Clinic Mapping Table

  1. New Tables
    - `provider_clinics`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, foreign key to providers)
      - `clinic_id` (uuid, foreign key to clinics)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on provider_clinics table
    - Add policy for anyone to view provider-clinic associations
*/

CREATE TABLE IF NOT EXISTS provider_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, clinic_id)
);

ALTER TABLE provider_clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view provider-clinic associations"
  ON provider_clinics FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert provider-clinic associations"
  ON provider_clinics FOR INSERT
  WITH CHECK (true);

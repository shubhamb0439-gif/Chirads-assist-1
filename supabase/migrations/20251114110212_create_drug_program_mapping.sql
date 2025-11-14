/*
  # Create Drug-Program Mapping Table

  1. New Tables
    - `drug_programs`
      - `id` (uuid, primary key)
      - `drug_id` (uuid, foreign key to drugs)
      - `program_id` (uuid, foreign key to programs)
      - `created_at` (timestamptz)
      - Maps which programs are available for specific drugs
  
  2. Security
    - Enable RLS on drug_programs table
    - Add policy for anyone to view drug-program associations
*/

CREATE TABLE IF NOT EXISTS drug_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id uuid REFERENCES drugs(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(drug_id, program_id)
);

ALTER TABLE drug_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view drug-program associations"
  ON drug_programs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert drug-program associations"
  ON drug_programs FOR INSERT
  WITH CHECK (true);

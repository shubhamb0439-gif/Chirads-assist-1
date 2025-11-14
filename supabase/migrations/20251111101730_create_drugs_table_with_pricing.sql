/*
  # Create Drugs Table with Pricing Information

  ## Overview
  This migration creates a drugs table to store drug information with pricing details
  and updates the drug_details table to reference the drugs table with pricing information.

  ## New Tables

  ### `drugs`
  - `id` (uuid, primary key) - Unique drug identifier
  - `name` (text, unique) - Drug name
  - `weekly_price` (numeric) - Weekly price for the drug
  - `monthly_price` (numeric) - Monthly price for the drug
  - `yearly_price` (numeric) - Yearly price for the drug
  - `created_at` (timestamptz) - Record creation timestamp

  ## Modified Tables

  ### `drug_details`
  - Add `drug_id` (uuid, foreign key) - Reference to drugs table
  - Add `weekly_price` (numeric) - Stored weekly price at time of selection
  - Add `monthly_price` (numeric) - Stored monthly price at time of selection
  - Add `yearly_price` (numeric) - Stored yearly price at time of selection
  - Keep `drug_name` for backward compatibility

  ## Security
  - Enable RLS on drugs table
  - Add policies for public read access to drugs
  - Update drug_details policies to work with new columns

  ## Sample Data
  - Insert sample drugs with pricing information
*/

-- Create drugs table
CREATE TABLE IF NOT EXISTS drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  weekly_price numeric NOT NULL,
  monthly_price numeric NOT NULL,
  yearly_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to drug_details table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drug_details' AND column_name = 'drug_id'
  ) THEN
    ALTER TABLE drug_details ADD COLUMN drug_id uuid REFERENCES drugs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drug_details' AND column_name = 'weekly_price'
  ) THEN
    ALTER TABLE drug_details ADD COLUMN weekly_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drug_details' AND column_name = 'monthly_price'
  ) THEN
    ALTER TABLE drug_details ADD COLUMN monthly_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drug_details' AND column_name = 'yearly_price'
  ) THEN
    ALTER TABLE drug_details ADD COLUMN yearly_price numeric;
  END IF;
END $$;

-- Enable RLS on drugs table
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drugs (public read)
CREATE POLICY "Anyone can view drugs"
  ON drugs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert drugs"
  ON drugs FOR INSERT
  WITH CHECK (true);

-- Insert sample drugs with pricing
INSERT INTO drugs (name, weekly_price, monthly_price, yearly_price) VALUES 
  ('Keytruda', 2500.00, 10000.00, 115000.00),
  ('Humira', 1500.00, 6000.00, 70000.00),
  ('Revlimid', 2000.00, 8000.00, 90000.00),
  ('Eliquis', 500.00, 2000.00, 23000.00),
  ('Opdivo', 2800.00, 11000.00, 125000.00),
  ('Enbrel', 1400.00, 5500.00, 65000.00),
  ('Imbruvica', 2200.00, 8800.00, 100000.00),
  ('Xarelto', 480.00, 1900.00, 22000.00),
  ('Avastin', 2400.00, 9500.00, 110000.00),
  ('Rituxan', 2100.00, 8300.00, 95000.00)
ON CONFLICT (name) DO NOTHING;

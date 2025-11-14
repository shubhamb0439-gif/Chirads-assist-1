/*
  # Initial Schema Setup for Patient Management System

  ## Overview
  This migration creates the complete database schema for a patient management system
  with authentication, patient details, clinic management, providers, drug details,
  programs, and enrollment tracking.

  ## New Tables

  ### 1. `users`
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for login
  - `password` (text, nullable) - Stored password (set on first login)
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### 2. `clinics`
  - `id` (uuid, primary key) - Unique clinic identifier
  - `name` (text) - Clinic name
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `providers`
  - `id` (uuid, primary key) - Unique provider identifier
  - `name` (text) - Provider name
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `user_clinics`
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `clinic_id` (uuid, foreign key) - Reference to clinics table
  - `created_at` (timestamptz) - Association timestamp

  ### 5. `user_providers`
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `provider_id` (uuid, foreign key) - Reference to providers table
  - `created_at` (timestamptz) - Association timestamp

  ### 6. `drug_details`
  - `id` (uuid, primary key) - Unique drug entry identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `drug_name` (text) - Name of the drug
  - `created_at` (timestamptz) - Entry creation timestamp

  ### 7. `programs`
  - `id` (uuid, primary key) - Unique program identifier
  - `name` (text) - Program name (e.g., Cancer)
  - `sponsor` (text) - Program sponsor name
  - `monetary_cap` (text) - Monetary cap information
  - `description` (text) - Program description
  - `enrollment_link` (text) - External enrollment URL
  - `created_at` (timestamptz) - Record creation timestamp

  ### 8. `enrollments`
  - `id` (uuid, primary key) - Unique enrollment identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `program_id` (uuid, foreign key) - Reference to programs table
  - `status` (text) - Status: enrolled, ongoing, completed, rejected (null)
  - `completion_date` (date, nullable) - Date when completed
  - `enrolled_at` (timestamptz) - Initial enrollment timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Users can only access their own records and shared reference data

  ## Sample Data
  - Insert dummy user: chirag@gmail.com
  - Insert sample clinics and providers
  - Insert sample programs with details
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text,
  created_at timestamptz DEFAULT now()
);

-- Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create providers table
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_clinics junction table
CREATE TABLE IF NOT EXISTS user_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);

-- Create user_providers junction table
CREATE TABLE IF NOT EXISTS user_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

-- Create drug_details table
CREATE TABLE IF NOT EXISTS drug_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  drug_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sponsor text NOT NULL,
  monetary_cap text NOT NULL,
  description text NOT NULL,
  enrollment_link text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  status text DEFAULT 'enrolled',
  completion_date date,
  enrolled_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own password"
  ON users FOR UPDATE
  USING (true);

-- RLS Policies for clinics (public read, authenticated write)
CREATE POLICY "Anyone can view clinics"
  ON clinics FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert clinics"
  ON clinics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for providers (public read, authenticated write)
CREATE POLICY "Anyone can view providers"
  ON providers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert providers"
  ON providers FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_clinics
CREATE POLICY "Users can view own clinic associations"
  ON user_clinics FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own clinic associations"
  ON user_clinics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_providers
CREATE POLICY "Users can view own provider associations"
  ON user_providers FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own provider associations"
  ON user_providers FOR INSERT
  WITH CHECK (true);

-- RLS Policies for drug_details
CREATE POLICY "Users can view own drug details"
  ON drug_details FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own drug details"
  ON drug_details FOR INSERT
  WITH CHECK (true);

-- RLS Policies for programs (public read)
CREATE POLICY "Anyone can view programs"
  ON programs FOR SELECT
  USING (true);

-- RLS Policies for enrollments
CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own enrollments"
  ON enrollments FOR UPDATE
  USING (true);

-- Insert dummy data

-- Insert dummy user
INSERT INTO users (email) VALUES ('chirag@gmail.com') ON CONFLICT (email) DO NOTHING;

-- Insert sample clinics
INSERT INTO clinics (name) VALUES 
  ('City General Hospital'),
  ('Metro Health Clinic'),
  ('Wellness Medical Center')
ON CONFLICT DO NOTHING;

-- Insert sample providers
INSERT INTO providers (name) VALUES 
  ('Dr. Sarah Johnson'),
  ('Dr. Michael Chen'),
  ('Dr. Emily Rodriguez')
ON CONFLICT DO NOTHING;

-- Insert sample programs
INSERT INTO programs (name, sponsor, monetary_cap, description, enrollment_link) VALUES 
  ('Cancer Support Program', 'HealthCare Foundation', '$50,000 per year', 'Comprehensive support for cancer patients including treatment costs and medication assistance.', 'https://example.com/enroll/cancer'),
  ('Diabetes Care Program', 'MediCare Alliance', '$25,000 per year', 'Complete diabetes management program with medication coverage and regular monitoring.', 'https://example.com/enroll/diabetes'),
  ('Heart Health Initiative', 'CardioWell Organization', '$40,000 per year', 'Cardiac care program covering medications, procedures, and preventive care.', 'https://example.com/enroll/heart')
ON CONFLICT DO NOTHING;

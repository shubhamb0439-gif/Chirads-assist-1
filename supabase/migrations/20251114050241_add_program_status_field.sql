/*
  # Add Program Status Field

  ## Overview
  This migration adds a program_status field to the programs table to track
  the current status of each program (waitlisted, open, closed, identified).

  ## Modified Tables

  ### `programs`
  - Add `program_status` (text) - Current status of the program
    - Possible values: 'waitlisted', 'open', 'closed', 'identified'
    - Default: 'open'

  ## Notes
  - Status colors will be handled in the frontend:
    - open: green
    - waitlisted: orange/yellow
    - closed: red
    - identified: blue
  - Alerts can be triggered when status changes from closed/waitlisted to open
*/

-- Add program_status column to programs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'program_status'
  ) THEN
    ALTER TABLE programs ADD COLUMN program_status text DEFAULT 'open';
  END IF;
END $$;

-- Update existing programs with sample statuses
UPDATE programs SET program_status = 'open' WHERE name = 'Cancer Support Program';
UPDATE programs SET program_status = 'waitlisted' WHERE name = 'Diabetes Care Program';
UPDATE programs SET program_status = 'closed' WHERE name = 'Heart Health Initiative';
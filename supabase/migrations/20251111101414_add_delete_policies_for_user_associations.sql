/*
  # Add DELETE policies for user associations

  ## Changes
  This migration adds missing DELETE policies for user_clinics and user_providers tables
  to allow users to remove their clinic and provider associations.

  ## Security
  - Add DELETE policy for user_clinics table
  - Add DELETE policy for user_providers table
  - Both policies allow any authenticated user to delete records (consistent with existing INSERT policies)
*/

-- Add DELETE policy for user_clinics
CREATE POLICY "Users can delete own clinic associations"
  ON user_clinics FOR DELETE
  USING (true);

-- Add DELETE policy for user_providers
CREATE POLICY "Users can delete own provider associations"
  ON user_providers FOR DELETE
  USING (true);

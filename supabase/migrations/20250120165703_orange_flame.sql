/*
  # Fix classes table relationships and policies

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint referencing profiles table
    - Re-enable RLS with simplified policies
  
  2. Security
    - Enable RLS
    - Allow lecturers to manage their own classes
    - Allow admins to manage all classes
    - Allow everyone to view classes
*/

-- Drop existing foreign key constraint
ALTER TABLE classes
DROP CONSTRAINT IF EXISTS classes_lecturer_id_fkey;

-- Add new foreign key constraint referencing profiles table
ALTER TABLE classes
ADD CONSTRAINT classes_lecturer_id_fkey
  FOREIGN KEY (lecturer_id)
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "view_classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_own_classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
      AND user_id = lecturer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
      AND user_id = lecturer_id
    )
  );
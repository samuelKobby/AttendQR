/*
  # Fix class management policies

  1. Changes
    - Drop all existing class policies
    - Create new simplified policies that properly handle lecturer permissions
    - Enable RLS on classes table
  
  2. Security
    - Allow lecturers to manage their own classes
    - Allow admins to manage all classes
    - Allow anyone to view classes
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "anyone_view_classes" ON classes;
DROP POLICY IF EXISTS "lecturer_manage_classes" ON classes;
DROP POLICY IF EXISTS "lecturer_update_own_classes" ON classes;
DROP POLICY IF EXISTS "lecturer_delete_own_classes" ON classes;
DROP POLICY IF EXISTS "admin_manage_classes" ON classes;

-- Create simplified policies
CREATE POLICY "anyone_view_classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lecturer_manage_classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
    )
    AND (
      auth.uid() = lecturer_id -- For existing classes
      OR 
      CASE 
        WHEN current_setting('request.method', true) = 'POST' 
        THEN true -- Allow creation of new classes
        ELSE false
      END
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
    )
    AND auth.uid() = lecturer_id
  );

CREATE POLICY "admin_manage_classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
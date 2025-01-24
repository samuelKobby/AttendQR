/*
  # Update RLS Policies for Classes Table

  1. Changes
    - Drop all existing policies to avoid conflicts
    - Create simplified policies with proper role checks
    - Add basic view permission for all authenticated users
    - Add specific management permissions for lecturers and admins

  2. Security
    - Enable RLS on classes table
    - Ensure proper role-based access control
    - Allow basic viewing for all authenticated users
    - Restrict management to appropriate roles
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "lecturer_manage_own_classes" ON classes;
DROP POLICY IF EXISTS "student_view_enrolled_classes" ON classes;
DROP POLICY IF EXISTS "admin_manage_all_classes" ON classes;
DROP POLICY IF EXISTS "anyone_view_classes" ON classes;

-- Create a basic view policy for all authenticated users
CREATE POLICY "anyone_view_classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for lecturers to manage their own classes
CREATE POLICY "lecturer_manage_classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
      AND auth.uid() = classes.lecturer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
      AND auth.uid() = classes.lecturer_id
    )
  );

-- Create policy for admins to manage all classes
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
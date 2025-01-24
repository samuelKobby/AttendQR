/*
  # Update RLS Policies for Classes Table

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper role checks
    - Fix policy naming conflicts
    - Ensure proper access control for all roles

  2. Security
    - Maintain strict role-based access control
    - Ensure lecturers can only manage their own classes
    - Allow students to view their enrolled classes
    - Grant admin full access
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Lecturers can view and manage their classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
DROP POLICY IF EXISTS "Lecturers can manage their own classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;

-- Create new policies with unique names
CREATE POLICY "lecturer_manage_own_classes"
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

CREATE POLICY "student_view_enrolled_classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'student'
      AND EXISTS (
        SELECT 1 FROM class_enrollments
        WHERE class_enrollments.class_id = classes.id
        AND class_enrollments.student_id = auth.uid()
      )
    )
  );

CREATE POLICY "admin_manage_all_classes"
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
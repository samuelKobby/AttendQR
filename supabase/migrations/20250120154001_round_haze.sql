/*
  # Fix Class and Class Enrollment Policies

  1. Changes
    - Remove recursive role checks from policies
    - Add simpler admin checks based on role column
    - Update policies to prevent infinite recursion
    
  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Allow admins to manage all classes
*/

-- Drop existing policies for classes
DROP POLICY IF EXISTS "Lecturers can create and manage their classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;

-- Create new policies for classes
CREATE POLICY "Admins can manage all classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Lecturers can manage their own classes"
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
  );

CREATE POLICY "Students can view enrolled classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE student_id = auth.uid()
      AND class_id = id
    )
  );

-- Drop existing policies for class_enrollments
DROP POLICY IF EXISTS "Lecturers can manage class enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Students can view their enrollments" ON class_enrollments;

-- Create new policies for class_enrollments
CREATE POLICY "Admins can manage all enrollments"
  ON class_enrollments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Lecturers can manage their class enrollments"
  ON class_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_id 
      AND lecturer_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'lecturer'
      )
    )
  );

CREATE POLICY "Students can view their own enrollments"
  ON class_enrollments
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Update class_sessions policies
DROP POLICY IF EXISTS "Lecturers can create sessions for their classes" ON class_sessions;
DROP POLICY IF EXISTS "Lecturers can view their own sessions" ON class_sessions;

CREATE POLICY "Admins can manage all sessions"
  ON class_sessions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Lecturers can manage their class sessions"
  ON class_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'lecturer'
      AND user_id = lecturer_id
    )
  );

CREATE POLICY "Students can view their enrolled sessions"
  ON class_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.student_id = auth.uid()
      AND ce.class_id = class_id
    )
  );
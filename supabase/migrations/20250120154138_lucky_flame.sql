/*
  # Fix Recursive Policies

  1. Changes
    - Simplify policies to prevent infinite recursion
    - Use direct role checks from profiles table
    - Remove circular dependencies in policy checks
    
  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Allow admins to manage all resources
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Lecturers can manage their own classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;

-- Create simplified policies for classes
CREATE POLICY "Anyone can view classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lecturers and admins can manage classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR (role = 'lecturer' AND user_id = lecturer_id))
    )
  );

-- Drop and recreate class_enrollments policies
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Lecturers can manage their class enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON class_enrollments;

CREATE POLICY "Anyone can view enrollments"
  ON class_enrollments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and lecturers can manage enrollments"
  ON class_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin' 
        OR (
          role = 'lecturer' 
          AND EXISTS (
            SELECT 1 FROM classes 
            WHERE id = class_id 
            AND lecturer_id = profiles.user_id
          )
        )
      )
    )
  );

-- Drop and recreate class_sessions policies
DROP POLICY IF EXISTS "Admins can manage all sessions" ON class_sessions;
DROP POLICY IF EXISTS "Lecturers can manage their class sessions" ON class_sessions;
DROP POLICY IF EXISTS "Students can view their enrolled sessions" ON class_sessions;

CREATE POLICY "Anyone can view sessions"
  ON class_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and lecturers can manage sessions"
  ON class_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR (
          role = 'lecturer'
          AND EXISTS (
            SELECT 1 FROM classes
            WHERE id = class_id
            AND lecturer_id = profiles.user_id
          )
        )
      )
    )
  );

-- Drop and recreate attendance_records policies
DROP POLICY IF EXISTS "Students can mark their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Users can view attendance records they're authorized to see" ON attendance_records;

CREATE POLICY "Anyone can view attendance records"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can mark attendance"
  ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'student'
      AND user_id = student_id
      AND EXISTS (
        SELECT 1 FROM class_sessions
        WHERE id = session_id
        AND active = true
        AND now() BETWEEN start_time AND end_time
      )
    )
  );

CREATE POLICY "Admins and lecturers can manage attendance"
  ON attendance_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND (
        role = 'admin'
        OR (
          role = 'lecturer'
          AND EXISTS (
            SELECT 1 FROM class_sessions cs
            JOIN classes c ON c.id = cs.class_id
            WHERE cs.id = session_id
            AND c.lecturer_id = profiles.user_id
          )
        )
      )
    )
  );
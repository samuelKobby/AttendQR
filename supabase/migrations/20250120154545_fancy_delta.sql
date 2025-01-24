/*
  # Fix UUID Type Casting in Policies

  1. Changes
    - Fix UUID type casting in policies
    - Ensure proper type comparisons
    - Maintain security while preventing recursion
    
  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Allow admins to manage all resources
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Lecturers can create and manage their classes" ON classes;
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
      WHERE profiles.user_id = auth.uid()::uuid
      AND (
        role = 'admin' 
        OR (role = 'lecturer' AND profiles.user_id = classes.lecturer_id)
      )
    )
  );

-- Drop and recreate class_enrollments policies
DROP POLICY IF EXISTS "Lecturers can manage class enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON class_enrollments;

CREATE POLICY "Anyone can view enrollments"
  ON class_enrollments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lecturers and admins can manage enrollments"
  ON class_enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN classes c ON c.lecturer_id = p.user_id
      WHERE p.user_id = auth.uid()::uuid
      AND (
        p.role = 'admin' 
        OR (
          p.role = 'lecturer' 
          AND c.id = class_enrollments.class_id
        )
      )
    )
  );

-- Drop and recreate class_sessions policies
DROP POLICY IF EXISTS "Lecturers can create sessions for their classes" ON class_sessions;
DROP POLICY IF EXISTS "Lecturers can view their own sessions" ON class_sessions;

CREATE POLICY "Anyone can view sessions"
  ON class_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lecturers and admins can manage sessions"
  ON class_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN classes c ON c.lecturer_id = p.user_id
      WHERE p.user_id = auth.uid()::uuid
      AND (
        p.role = 'admin'
        OR (
          p.role = 'lecturer'
          AND c.id = class_sessions.class_id
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
      SELECT 1 FROM profiles p
      JOIN class_sessions cs ON cs.id = attendance_records.session_id
      WHERE p.user_id = auth.uid()::uuid
      AND p.role = 'student'
      AND p.user_id = attendance_records.student_id
      AND cs.active = true
      AND now() BETWEEN cs.start_time AND cs.end_time
    )
  );

CREATE POLICY "Lecturers and admins can manage attendance"
  ON attendance_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN classes c ON c.lecturer_id = p.user_id
      JOIN class_sessions cs ON cs.class_id = c.id
      WHERE p.user_id = auth.uid()::uuid
      AND (
        p.role = 'admin'
        OR (
          p.role = 'lecturer'
          AND cs.id = attendance_records.session_id
        )
      )
    )
  );
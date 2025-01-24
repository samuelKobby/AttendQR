-- Drop existing policies
DROP POLICY IF EXISTS "Lecturers can view and manage their classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;

-- Create new policies for classes table
CREATE POLICY "Lecturers can manage their own classes"
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

CREATE POLICY "Students can view their enrolled classes"
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

CREATE POLICY "Admins can manage all classes"
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
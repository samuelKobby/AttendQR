-- Drop the problematic view if it exists
DROP VIEW IF EXISTS class_enrollment_stats;

-- Ensure classes table has all required columns
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS location text DEFAULT '',
ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule text DEFAULT '';

-- Update RLS policies for classes
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Lecturers and admins can manage classes" ON classes;

CREATE POLICY "Lecturers can view and manage their classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (lecturer_id = auth.uid())
  WITH CHECK (lecturer_id = auth.uid());

CREATE POLICY "Students can view enrolled classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = id
      AND class_enrollments.student_id = auth.uid()
    )
  );

-- Create a function to get class stats safely
CREATE OR REPLACE FUNCTION get_class_stats(class_id uuid)
RETURNS TABLE (
  total_students bigint,
  total_sessions bigint,
  attendance_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ce.student_id)::bigint as total_students,
    COUNT(DISTINCT cs.id)::bigint as total_sessions,
    COALESCE(
      AVG(
        CASE 
          WHEN COUNT(DISTINCT ar.id) > 0 
          THEN (COUNT(DISTINCT ar.id)::numeric / NULLIF(COUNT(DISTINCT ce.student_id), 0)) * 100
          ELSE 0
        END
      ),
      0
    ) as attendance_rate
  FROM classes c
  LEFT JOIN class_enrollments ce ON ce.class_id = c.id
  LEFT JOIN class_sessions cs ON cs.class_id = c.id
  LEFT JOIN attendance_records ar ON ar.session_id = cs.id
  WHERE c.id = get_class_stats.class_id
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
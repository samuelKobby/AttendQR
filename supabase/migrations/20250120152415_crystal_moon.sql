/*
  # Create attendance statistics function

  1. New Functions
    - `get_attendance_stats`
      Returns table with:
      - total_sessions (bigint)
      - total_attendances (bigint)
      - average_attendance (numeric)

  2. Purpose
    - Calculate overall attendance statistics across all classes
    - Provide summary metrics for dashboard
*/

-- Drop function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS get_attendance_stats();

-- Create attendance stats function
CREATE OR REPLACE FUNCTION get_attendance_stats()
RETURNS TABLE (
  total_sessions bigint,
  total_attendances bigint,
  average_attendance numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT cs.id) as total_sessions,
      COUNT(DISTINCT ar.id) as total_attendances,
      COUNT(DISTINCT ce.student_id) * COUNT(DISTINCT cs.id) as possible_attendances
    FROM class_sessions cs
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id
    LEFT JOIN class_enrollments ce ON ce.class_id = cs.class_id
  )
  SELECT
    total_sessions,
    total_attendances,
    CASE 
      WHEN possible_attendances = 0 THEN 0
      ELSE ROUND((total_attendances::numeric / NULLIF(possible_attendances, 0)) * 100, 2)
    END as average_attendance
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
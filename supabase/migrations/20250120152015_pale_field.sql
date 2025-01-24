/*
  # Add attendance statistics function

  1. New Functions
    - `get_attendance_stats`: Calculates overall attendance statistics
*/

-- Function to get overall attendance statistics
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
      COUNT(DISTINCT ar.id) as total_attendances
    FROM class_sessions cs
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id
  )
  SELECT
    total_sessions,
    total_attendances,
    COALESCE(
      (total_attendances::numeric / NULLIF(total_sessions, 0) * 100),
      0
    ) as average_attendance
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
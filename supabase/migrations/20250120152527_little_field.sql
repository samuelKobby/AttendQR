/*
  # Create attendance statistics function

  1. Functions
    - `get_attendance_stats`: Calculates overall attendance statistics
      - Returns:
        - total_sessions: Total number of class sessions
        - total_attendances: Total number of attendance records
        - average_attendance: Average attendance rate across all sessions
      - Includes proper handling of null values and division by zero
      - Uses security definer for proper access control

  2. Changes
    - Drops existing function if it exists
    - Creates new function with improved calculations
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_attendance_stats();

-- Create attendance stats function with improved calculations
CREATE OR REPLACE FUNCTION get_attendance_stats()
RETURNS TABLE (
  total_sessions bigint,
  total_attendances bigint,
  average_attendance numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      COUNT(DISTINCT cs.id) as total_sessions,
      COUNT(DISTINCT ar.id) as total_attendances,
      (
        SELECT COUNT(*) 
        FROM class_enrollments ce
      ) * COUNT(DISTINCT cs.id) as possible_attendances
    FROM class_sessions cs
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id
  )
  SELECT
    total_sessions,
    total_attendances,
    CASE 
      WHEN possible_attendances = 0 THEN 0
      ELSE ROUND((total_attendances::numeric / NULLIF(possible_attendances, 0)) * 100, 2)
    END as average_attendance
  FROM session_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
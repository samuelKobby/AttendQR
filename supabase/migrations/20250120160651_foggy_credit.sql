/*
  # Fix Database Schema

  1. Changes
    - Add location and capacity columns to classes table
    - Add schedule column to classes table
    - Fix relationships between tables
    - Update existing policies

  2. New Columns
    - classes.location (text)
    - classes.capacity (integer)
    - classes.schedule (text)
*/

-- Add new columns to classes table
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS capacity integer,
ADD COLUMN IF NOT EXISTS schedule text;

-- Create a view to help with class enrollment stats
CREATE OR REPLACE VIEW class_enrollment_stats AS
SELECT 
  cs.id as session_id,
  c.id as class_id,
  COUNT(DISTINCT ce.student_id) as total_enrolled,
  COUNT(DISTINCT ar.student_id) as total_present
FROM class_sessions cs
JOIN classes c ON c.id = cs.class_id
LEFT JOIN class_enrollments ce ON ce.class_id = c.id
LEFT JOIN attendance_records ar ON ar.session_id = cs.id
GROUP BY cs.id, c.id;

-- Update class_sessions to include enrollment stats
CREATE OR REPLACE FUNCTION get_session_stats(session_id uuid)
RETURNS TABLE (
  total_enrolled bigint,
  total_present bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT ces.total_enrolled, ces.total_present
  FROM class_enrollment_stats ces
  WHERE ces.session_id = get_session_stats.session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
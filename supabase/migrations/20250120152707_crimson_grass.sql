/*
  # Fix Database Relationships and Functions

  1. Changes
    - Add foreign key relationship between attendance_records and profiles
    - Fix ambiguous column references in get_students_with_stats
    - Update queries to use proper table aliases
    - Add proper column qualifiers

  2. Relationships Added
    - attendance_records.student_id -> profiles.user_id
*/

-- Add foreign key relationship between attendance_records and profiles
ALTER TABLE attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_student_id_fkey,
ADD CONSTRAINT attendance_records_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_lecturers_with_stats();
DROP FUNCTION IF EXISTS get_students_with_stats();
DROP FUNCTION IF EXISTS get_attendance_stats();

-- Function to get lecturers with their classes and students
CREATE OR REPLACE FUNCTION get_lecturers_with_stats()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  status text,
  last_sign_in_at timestamptz,
  class_count bigint,
  student_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    u.email::text,
    p.full_name,
    p.status,
    u.last_sign_in_at,
    COUNT(DISTINCT c.id) as class_count,
    COUNT(DISTINCT ce.student_id) as student_count
  FROM profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN classes c ON c.lecturer_id = p.user_id
  LEFT JOIN class_enrollments ce ON ce.class_id = c.id
  WHERE p.role = 'lecturer'
  GROUP BY p.user_id, u.email, p.full_name, p.status, u.last_sign_in_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get students with their enrollments and attendance
CREATE OR REPLACE FUNCTION get_students_with_stats()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  student_id text,
  status text,
  last_sign_in_at timestamptz,
  class_count bigint,
  attendance_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH student_stats AS (
    SELECT 
      p.user_id,
      u.email::text as student_email,
      p.full_name as student_name,
      p.student_id as student_identifier,
      p.status as student_status,
      u.last_sign_in_at as last_login,
      COUNT(DISTINCT ce.class_id) as enrolled_classes,
      COUNT(DISTINCT cs.id) as total_sessions,
      COUNT(DISTINCT ar.id) as attended_sessions
    FROM profiles p
    JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN class_enrollments ce ON ce.student_id = p.user_id
    LEFT JOIN class_sessions cs ON cs.class_id = ce.class_id
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = p.user_id
    WHERE p.role = 'student'
    GROUP BY p.user_id, u.email, p.full_name, p.student_id, p.status, u.last_sign_in_at
  )
  SELECT
    user_id,
    student_email,
    student_name,
    student_identifier,
    student_status,
    last_login,
    enrolled_classes,
    CASE 
      WHEN total_sessions = 0 THEN 0
      ELSE ROUND((attended_sessions::numeric / total_sessions) * 100, 2)
    END as attendance_rate
  FROM student_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get overall attendance statistics
CREATE OR REPLACE FUNCTION get_attendance_stats()
RETURNS TABLE (
  total_sessions bigint,
  total_attendances bigint,
  average_attendance numeric
) AS $$
DECLARE
  v_total_sessions bigint;
  v_total_attendances bigint;
  v_possible_attendances bigint;
BEGIN
  -- Calculate stats using variables to avoid ambiguous column references
  SELECT 
    COUNT(DISTINCT cs.id),
    COUNT(DISTINCT ar.id),
    (SELECT COUNT(*) FROM class_enrollments) * COUNT(DISTINCT cs.id)
  INTO 
    v_total_sessions,
    v_total_attendances,
    v_possible_attendances
  FROM class_sessions cs
  LEFT JOIN attendance_records ar ON ar.session_id = cs.id;

  RETURN QUERY
  SELECT 
    v_total_sessions,
    v_total_attendances,
    CASE 
      WHEN v_possible_attendances = 0 THEN 0
      ELSE ROUND((v_total_attendances::numeric / v_possible_attendances) * 100, 2)
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
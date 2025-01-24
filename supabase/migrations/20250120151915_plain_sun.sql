/*
  # Update queries for user management

  1. Changes
    - Update queries to use profiles table instead of auth.users directly
    - Add proper joins for role-based queries
*/

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
    u.email,
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
  SELECT 
    p.user_id,
    u.email,
    p.full_name,
    p.student_id,
    p.status,
    u.last_sign_in_at,
    COUNT(DISTINCT ce.class_id) as class_count,
    COALESCE(
      (COUNT(DISTINCT ar.id)::numeric / NULLIF(COUNT(DISTINCT cs.id), 0) * 100),
      0
    ) as attendance_rate
  FROM profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN class_enrollments ce ON ce.student_id = p.user_id
  LEFT JOIN class_sessions cs ON cs.class_id = ce.class_id
  LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = p.user_id
  WHERE p.role = 'student'
  GROUP BY p.user_id, u.email, p.full_name, p.student_id, p.status, u.last_sign_in_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
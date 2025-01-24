-- Drop existing generated column if it exists
ALTER TABLE profiles 
DROP COLUMN IF EXISTS email;

-- Add email column as a stored generated column
ALTER TABLE profiles
ADD COLUMN email text GENERATED ALWAYS AS (
  (SELECT email FROM auth.users WHERE id = user_id)
) STORED;

-- Create index on email for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update the class enrollment data function
CREATE OR REPLACE FUNCTION get_class_enrollment_data(class_id uuid)
RETURNS TABLE (
  class_name text,
  course_code text,
  location text,
  schedule text,
  student_name text,
  student_id text,
  student_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name as class_name,
    c.course_code,
    c.location,
    c.schedule,
    p.full_name as student_name,
    p.student_id,
    p.email as student_email
  FROM classes c
  JOIN class_enrollments ce ON ce.class_id = c.id
  JOIN profiles p ON p.user_id = ce.student_id
  WHERE c.id = get_class_enrollment_data.class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
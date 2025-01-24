-- Drop existing foreign key constraints if they exist
ALTER TABLE class_enrollments 
DROP CONSTRAINT IF EXISTS class_enrollments_student_id_fkey;

-- Add new foreign key constraint referencing profiles table
ALTER TABLE class_enrollments
ADD CONSTRAINT class_enrollments_student_id_fkey
  FOREIGN KEY (student_id)
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id 
ON class_enrollments(student_id);

-- Update the export query function
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
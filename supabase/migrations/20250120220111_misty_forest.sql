-- Add email column as a regular column
ALTER TABLE profiles 
DROP COLUMN IF EXISTS email;

ALTER TABLE profiles
ADD COLUMN email text;

-- Create index on email for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Create trigger to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;

-- Create trigger
CREATE TRIGGER sync_user_email_trigger
  AFTER INSERT OR UPDATE OF email
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Update existing profiles with emails
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
AND p.email IS NULL;

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
-- Drop existing function
DROP FUNCTION IF EXISTS update_settings(text, jsonb, uuid);

-- Create function with correct parameter order
CREATE OR REPLACE FUNCTION update_settings(
  setting_key text,
  setting_value jsonb,
  admin_user_id uuid
)
RETURNS system_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result system_settings;
BEGIN
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = admin_user_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update setting
  UPDATE system_settings
  SET 
    value = setting_value,
    updated_at = now(),
    updated_by = admin_user_id
  WHERE key = setting_key
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Setting not found';
  END IF;

  RETURN result;
END;
$$;
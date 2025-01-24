-- Drop existing policies and function first
DROP POLICY IF EXISTS "admin_manage_settings" ON system_settings;
DROP POLICY IF EXISTS "view_settings" ON system_settings;
DROP POLICY IF EXISTS "settings_admin_manage" ON system_settings;
DROP POLICY IF EXISTS "settings_view" ON system_settings;
DROP FUNCTION IF EXISTS update_settings(text, jsonb, uuid);

-- Create or update system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(user_id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "settings_admin_manage_v2"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "settings_view_v2"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure default settings exist
INSERT INTO system_settings (key, value) VALUES
  ('qr_settings', '{"refresh_interval": 10, "session_duration": 60}'::jsonb),
  ('security_settings', '{"max_login_attempts": 3, "min_password_length": 8, "two_factor_auth": false, "ip_restriction": false}'::jsonb),
  ('notification_settings', '{"login_alerts": true, "qr_alerts": true, "attendance_alerts": true}'::jsonb),
  ('system_preferences', '{"timezone": "UTC", "date_format": "YYYY-MM-DD", "auto_logout": 30}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create updated settings function
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
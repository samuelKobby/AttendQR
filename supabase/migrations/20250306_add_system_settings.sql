-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- QR Settings
    qr_refresh_interval INTEGER DEFAULT 5,
    qr_session_duration INTEGER DEFAULT 60,
    -- Security Settings
    max_login_attempts INTEGER DEFAULT 3,
    min_password_length INTEGER DEFAULT 8,
    two_factor_auth BOOLEAN DEFAULT false,
    ip_restriction BOOLEAN DEFAULT false,
    -- Notification Settings
    login_alerts BOOLEAN DEFAULT true,
    qr_alerts BOOLEAN DEFAULT true,
    attendance_alerts BOOLEAN DEFAULT true,
    -- System Preferences
    timezone TEXT DEFAULT 'UTC',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    auto_logout INTEGER DEFAULT 30,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify system settings
CREATE POLICY "Admins can view system settings"
ON system_settings FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

CREATE POLICY "Admins can modify system settings"
ON system_settings FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

-- Drop existing table and its policies
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    qr_refresh_interval INTEGER NOT NULL DEFAULT 5,
    qr_session_duration INTEGER NOT NULL DEFAULT 5,
    max_login_attempts INTEGER NOT NULL DEFAULT 3,
    min_password_length INTEGER NOT NULL DEFAULT 8,
    two_factor_auth BOOLEAN NOT NULL DEFAULT false,
    ip_restriction BOOLEAN NOT NULL DEFAULT false,
    login_alerts BOOLEAN NOT NULL DEFAULT true,
    qr_alerts BOOLEAN NOT NULL DEFAULT true,
    attendance_alerts BOOLEAN NOT NULL DEFAULT true,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    auto_logout INTEGER NOT NULL DEFAULT 30,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (created_by)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings"
    ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own settings"
    ON public.system_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own settings"
    ON public.system_settings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own settings"
    ON public.system_settings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Grant permissions
GRANT ALL ON public.system_settings TO authenticated;

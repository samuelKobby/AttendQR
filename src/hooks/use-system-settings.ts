import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface SystemSettings {
  qr_refresh_interval: number;
  qr_session_duration: number;
  max_login_attempts: number;
  min_password_length: number;
  two_factor_auth: boolean;
  ip_restriction: boolean;
  login_alerts: boolean;
  qr_alerts: boolean;
  attendance_alerts: boolean;
  timezone: string;
  date_format: string;
  auto_logout: number;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authState } = useAuth();

  useEffect(() => {
    if (authState?.user?.id) {
      fetchSettings();
    }
  }, [authState?.user?.id]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!authState?.user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching settings for user:', authState.user.id);

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('created_by', authState.user.id)
        .maybeSingle();

      console.log('Fetched settings:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings exist, use defaults
          const defaultSettings: SystemSettings = {
            qr_refresh_interval: 5,
            qr_session_duration: 5,
            max_login_attempts: 3,
            min_password_length: 8,
            two_factor_auth: false,
            ip_restriction: false,
            login_alerts: true,
            qr_alerts: true,
            attendance_alerts: true,
            timezone: 'UTC',
            date_format: 'YYYY-MM-DD',
            auto_logout: 30
          };
          setSettings(defaultSettings);
        } else {
          throw error;
        }
      } else if (data) {
        setSettings(data);
      } else {
        // No settings found, use defaults
        const defaultSettings: SystemSettings = {
          qr_refresh_interval: 5,
          qr_session_duration: 5,
          max_login_attempts: 3,
          min_password_length: 8,
          two_factor_auth: false,
          ip_restriction: false,
          login_alerts: true,
          qr_alerts: true,
          attendance_alerts: true,
          timezone: 'UTC',
          date_format: 'YYYY-MM-DD',
          auto_logout: 30
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings
  };
}

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  QrCode,
  Shield,
  Bell,
  Mail,
  Clock,
  Lock,
  Save,
  RefreshCw,
  Globe,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

interface Settings {
  qr_settings: {
    refresh_interval: number;
    session_duration: number;
  };
  security_settings: {
    max_login_attempts: number;
    min_password_length: number;
    two_factor_auth: boolean;
    ip_restriction: boolean;
  };
  notification_settings: {
    login_alerts: boolean;
    qr_alerts: boolean;
    attendance_alerts: boolean;
  };
  system_preferences: {
    timezone: string;
    date_format: string;
    auto_logout: number;
  };
}

export function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { authState } = useAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      if (!authState.user?.id) {
        setError('User not authenticated');
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('system_settings')
        .select(`
          id,
          qr_refresh_interval,
          qr_session_duration,
          max_login_attempts,
          min_password_length,
          two_factor_auth,
          ip_restriction,
          login_alerts,
          qr_alerts,
          attendance_alerts,
          timezone,
          date_format,
          auto_logout,
          created_by,
          created_at,
          updated_by,
          updated_at
        `)
        .eq('created_by', authState.user.id)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create default settings
          const defaultSettings = {
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
            auto_logout: 30,
            created_by: authState.user.id
          };

          const { error: insertError, data: newSettings } = await supabase
            .from('system_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating settings:', insertError);
            throw new Error('Failed to create settings');
          }

          setSettings({
            qr_settings: {
              refresh_interval: defaultSettings.qr_refresh_interval,
              session_duration: defaultSettings.qr_session_duration
            },
            security_settings: {
              max_login_attempts: defaultSettings.max_login_attempts,
              min_password_length: defaultSettings.min_password_length,
              two_factor_auth: defaultSettings.two_factor_auth,
              ip_restriction: defaultSettings.ip_restriction
            },
            notification_settings: {
              login_alerts: defaultSettings.login_alerts,
              qr_alerts: defaultSettings.qr_alerts,
              attendance_alerts: defaultSettings.attendance_alerts
            },
            system_preferences: {
              timezone: defaultSettings.timezone,
              date_format: defaultSettings.date_format,
              auto_logout: defaultSettings.auto_logout
            }
          });
        } else {
          console.error('Error fetching settings:', error);
          throw new Error('Failed to fetch settings');
        }
      } else if (data) {
        setSettings({
          qr_settings: {
            refresh_interval: data.qr_refresh_interval,
            session_duration: data.qr_session_duration
          },
          security_settings: {
            max_login_attempts: data.max_login_attempts,
            min_password_length: data.min_password_length,
            two_factor_auth: data.two_factor_auth,
            ip_restriction: data.ip_restriction
          },
          notification_settings: {
            login_alerts: data.login_alerts,
            qr_alerts: data.qr_alerts,
            attendance_alerts: data.attendance_alerts
          },
          system_preferences: {
            timezone: data.timezone,
            date_format: data.date_format,
            auto_logout: data.auto_logout
          }
        });
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !authState.user?.id) {
      setError('Unable to save settings: User not authenticated');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      console.log('Saving settings:', settings);

      // Get existing settings first
      const { data: existingSettings, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('created_by', authState.user.id)
        .maybeSingle();

      console.log('Existing settings:', existingSettings);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing settings:', fetchError);
        throw fetchError;
      }

      const updateData = {
        qr_refresh_interval: settings.qr_settings.refresh_interval,
        qr_session_duration: settings.qr_settings.session_duration,
        max_login_attempts: settings.security_settings.max_login_attempts,
        min_password_length: settings.security_settings.min_password_length,
        two_factor_auth: settings.security_settings.two_factor_auth,
        ip_restriction: settings.security_settings.ip_restriction,
        login_alerts: settings.notification_settings.login_alerts,
        qr_alerts: settings.notification_settings.qr_alerts,
        attendance_alerts: settings.notification_settings.attendance_alerts,
        timezone: settings.system_preferences.timezone,
        date_format: settings.system_preferences.date_format,
        auto_logout: settings.system_preferences.auto_logout,
        updated_by: authState.user.id,
        updated_at: new Date().toISOString()
      };

      console.log('Update data:', updateData);

      let savedSettings;

      if (existingSettings?.id) {
        // Update existing settings
        console.log('Updating existing settings with ID:', existingSettings.id);
        const { data, error } = await supabase
          .from('system_settings')
          .update(updateData)
          .eq('created_by', authState.user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating settings:', error);
          throw error;
        }
        console.log('Settings updated successfully:', data);
        savedSettings = data;
      } else {
        // Insert new settings
        console.log('Creating new settings for user:', authState.user.id);
        const { data, error } = await supabase
          .from('system_settings')
          .insert({
            ...updateData,
            created_by: authState.user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting settings:', error);
          throw error;
        }
        console.log('Settings created successfully:', data);
        savedSettings = data;
      }

      if (savedSettings) {
        // Update local state with saved data
        const newSettings = {
          qr_settings: {
            refresh_interval: savedSettings.qr_refresh_interval,
            session_duration: savedSettings.qr_session_duration
          },
          security_settings: {
            max_login_attempts: savedSettings.max_login_attempts,
            min_password_length: savedSettings.min_password_length,
            two_factor_auth: savedSettings.two_factor_auth,
            ip_restriction: savedSettings.ip_restriction
          },
          notification_settings: {
            login_alerts: savedSettings.login_alerts,
            qr_alerts: savedSettings.qr_alerts,
            attendance_alerts: savedSettings.attendance_alerts
          },
          system_preferences: {
            timezone: savedSettings.timezone,
            date_format: savedSettings.date_format,
            auto_logout: savedSettings.auto_logout
          }
        };
        console.log('Updating local state with:', newSettings);
        setSettings(newSettings);
        setSuccess('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section: keyof Settings, field: string, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    });
  };

  const validateSettings = (
    category: keyof Settings,
    key: string,
    value: any
  ): { isValid: boolean; error?: string } => {
    switch (`${category}.${key}`) {
      case 'qr_settings.refresh_interval':
        return {
          isValid: value >= 1 && value <= 60,
          error: 'Refresh interval must be between 1 and 60 minutes'
        };
      case 'qr_settings.session_duration':
        return {
          isValid: value >= 3 && value <= 10,
          error: 'Session duration must be between 3 and 10 minutes'
        };
      case 'security_settings.max_login_attempts':
        return {
          isValid: value >= 1 && value <= 10,
          error: 'Max login attempts must be between 1 and 10'
        };
      case 'security_settings.min_password_length':
        return {
          isValid: value >= 8 && value <= 32,
          error: 'Password length must be between 8 and 32 characters'
        };
      case 'system_preferences.auto_logout':
        return {
          isValid: value >= 5 && value <= 120,
          error: 'Auto logout must be between 5 and 120 minutes'
        };
      default:
        return { isValid: true };
    }
  };

  const updateSettings = (
    category: keyof Settings,
    key: string,
    value: any
  ) => {
    if (!settings) return;

    if (typeof settings[category][key] === 'number') {
      value = parseInt(value) || 0;
    }

    const validation = validateSettings(category, key, value);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid setting value');
      return;
    }

    setError(null);
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-10 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-gray-500">Configure system preferences and security settings</p>
        </div>
        <div className="mt-6 flex items-center justify-end space-x-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Settings */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-6">
            <QrCode className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">QR Code Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                QR Code Refresh Interval (minutes)
              </label>
              <Input
                type="number"
                value={settings?.qr_settings.refresh_interval || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  updateSettings('qr_settings', 'refresh_interval', value);
                }}
                min="1"
                max="60"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="sessionDuration"
                className="block text-sm font-medium text-gray-700"
              >
                Session Duration (minutes)
              </label>
              <Input
                id="sessionDuration"
                type="number"
                min={3}
                max={10}
                value={settings?.qr_settings.session_duration || 5}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 3;
                  const validValue = Math.min(Math.max(3, value), 10);
                  handleInputChange('qr_settings', 'session_duration', validValue);
                }}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                Set the duration for each attendance session (3-10 minutes)
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Shield className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">Security Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Login Attempts
              </label>
              <Input
                type="number"
                value={settings?.security_settings.max_login_attempts || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  updateSettings('security_settings', 'max_login_attempts', value);
                }}
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Password Length
              </label>
              <Input
                type="number"
                value={settings?.security_settings.min_password_length || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  updateSettings('security_settings', 'min_password_length', value);
                }}
                min="8"
                max="32"
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="2fa"
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  checked={settings.security_settings.two_factor_auth}
                  onChange={(e) => updateSettings('security_settings', 'two_factor_auth', e.target.checked)}
                />
                <label
                  htmlFor="2fa"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Enable Two-Factor Authentication (2FA)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ipRestriction"
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  checked={settings.security_settings.ip_restriction}
                  onChange={(e) => updateSettings('security_settings', 'ip_restriction', e.target.checked)}
                />
                <label
                  htmlFor="ipRestriction"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Enable IP Address Restriction
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Bell className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Notification Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="loginAlerts"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={settings.notification_settings.login_alerts}
                    onChange={(e) => updateSettings('notification_settings', 'login_alerts', e.target.checked)}
                  />
                  <label
                    htmlFor="loginAlerts"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Failed Login Attempts
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="qrAlerts"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={settings.notification_settings.qr_alerts}
                    onChange={(e) => updateSettings('notification_settings', 'qr_alerts', e.target.checked)}
                  />
                  <label
                    htmlFor="qrAlerts"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    QR Code Generation
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="attendanceAlerts"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={settings.notification_settings.attendance_alerts}
                    onChange={(e) => updateSettings('notification_settings', 'attendance_alerts', e.target.checked)}
                  />
                  <label
                    htmlFor="attendanceAlerts"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Low Attendance Alerts
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-6">
            <SettingsIcon className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">System Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Zone
              </label>
              <select 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={settings.system_preferences.timezone}
                onChange={(e) => updateSettings('system_preferences', 'timezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={settings.system_preferences.date_format}
                onChange={(e) => updateSettings('system_preferences', 'date_format', e.target.value)}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Logout (minutes)
              </label>
              <Input
                type="number"
                value={settings?.system_preferences.auto_logout || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  updateSettings('system_preferences', 'auto_logout', value);
                }}
                min="5"
                max="120"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
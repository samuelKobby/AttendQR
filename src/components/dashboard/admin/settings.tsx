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
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      if (data) {
        const settingsObj = data.reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {} as Settings);

        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Update each settings category
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase.rpc('update_settings', {
          setting_key: key,
          setting_value: value,
          admin_user_id: authState.user?.id
        });

        if (error) throw error;
      }

      setSuccess('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (
    category: keyof Settings,
    key: string,
    value: any
  ) => {
    if (!settings) return;

    // Handle numeric inputs
    if (typeof value === 'number' && isNaN(value)) {
      value = 0; // Set default value for invalid numbers
    }

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-gray-500">Configure system preferences and security settings</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Duration (minutes)
              </label>
              <Input
                type="number"
                value={settings?.qr_settings.session_duration || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  updateSettings('qr_settings', 'session_duration', value);
                }}
                min="15"
                max="180"
              />
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
                min="6"
                max="20"
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
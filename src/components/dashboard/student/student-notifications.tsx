import { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'warning' | 'success' | 'info';
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authState.user?.id)
        .order('timestamp', { ascending: false });

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-gray-500">Stay updated with your attendance and classes</p>
        </div>
        <div className="relative">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
          {notifications.some((n) => !n.read) && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm divide-y">
        {notifications.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-gray-500">
            <Bell className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm sm:text-base">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${
                !notification.read ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`p-2 rounded-full ${
                    notification.type === 'warning'
                      ? 'bg-yellow-100'
                      : notification.type === 'success'
                      ? 'bg-green-100'
                      : 'bg-blue-100'
                  }`}
                >
                  {notification.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  ) : notification.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  ) : (
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-x-2">
                    <p className="text-sm sm:text-base font-medium truncate">
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {format(parseISO(notification.timestamp), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

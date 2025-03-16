import { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StudentAvatar } from '@/components/ui/student-avatar';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  type: 'warning' | 'success' | 'info';
}

export function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    if (!authState.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authState.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      if (Array.isArray(data)) {
        setNotifications(data.filter(n => n && n.created_at));
        setSelectedNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const markAllAsRead = async () => {
    if (!authState.user?.id || notifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', authState.user.id)
        .in('id', notifications.map(n => n.id));

      if (error) {
        console.error('Error marking all notifications as read:', error);
        toast.error('Failed to mark notifications as read');
        return;
      }
      
      // Update local state to mark all notifications as read
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const deleteSelectedNotifications = async () => {
    if (!authState.user?.id || selectedNotifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', authState.user.id)
        .in('id', selectedNotifications);

      if (error) {
        console.error('Error deleting notifications:', error);
        toast.error('Failed to delete notifications');
        return;
      }
      
      // Update local state to remove deleted notifications
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.includes(n.id))
      );
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notification(s) deleted`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'MMM d, HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <StudentAvatar name={authState.user?.full_name || ''} size="lg" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-500">Stay updated with your attendance and classes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead}
            className="text-xs sm:text-sm hover:bg-blue-500/15 hover:text-blue-600 hover:border-blue-500/25"
            disabled={notifications.length === 0 || notifications.every(n => n.read)}
          >
            <Bell className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
          {selectedNotifications.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={deleteSelectedNotifications}
              className="text-xs sm:text-sm text-red-600 hover:bg-red-500/10 hover:text-red-700 hover:border-red-500/25"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedNotifications.length})
            </Button>
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
              className={`p-4 sm:p-6 hover:bg-blue-500/15 transition-colors ${
                !notification.read ? 'bg-blue-500/15' : ''
              } ${selectedNotifications.includes(notification.id) ? 'bg-blue-600/25' : ''}`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={() => toggleNotificationSelection(notification.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>
                <div
                  className={`p-2 rounded-full ${
                    notification.type === 'warning'
                      ? 'bg-yellow-500/15 text-yellow-600'
                      : notification.type === 'success'
                      ? 'bg-green-500/15 text-green-600'
                      : 'bg-blue-500/15 text-blue-600'
                  }`}
                >
                  {notification.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : notification.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-x-2">
                    <p className="text-sm sm:text-base font-medium truncate">
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(notification.created_at)}
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

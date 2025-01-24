import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Bell,
  BookOpen,
  Home,
  LogOut,
  QrCode,
  Settings,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

const adminLinks = [
  { to: '/admin', icon: Home, label: 'Dashboard' },
  { to: '/admin/lecturers', icon: Users, label: 'Lecturers' },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const lecturerLinks = [
  { to: '/lecturer', icon: Home, label: 'Dashboard' },
  { to: '/lecturer/classes', icon: BookOpen, label: 'My Classes' },
  { to: '/lecturer/attendance', icon: QrCode, label: 'Take Attendance' },
  { to: '/lecturer/reports', icon: BarChart3, label: 'Reports' },
];

const studentLinks = [
  { to: '/student', icon: Home, label: 'Dashboard' },
  { to: '/student/attendance', icon: QrCode, label: 'Mark Attendance' },
  { to: '/student/history', icon: BarChart3, label: 'History' },
  { to: '/student/notifications', icon: Bell, label: 'Notifications' },
];

interface SidebarProps {
  role: 'admin' | 'lecturer' | 'student';
}

export function Sidebar({ role }: SidebarProps) {
  const { logout, authState } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const links = {
    admin: adminLinks,
    lecturer: lecturerLinks,
    student: studentLinks,
  }[role];

  const roleColor = {
    admin: 'bg-purple-600',
    lecturer: 'bg-green-600',
    student: 'bg-blue-600',
  }[role];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white shadow-md lg:hidden hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-gray-900 text-gray-100 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen',
          {
            'translate-x-0': isOpen,
            '-translate-x-full': !isOpen,
          }
        )}
      >
        <div className="flex flex-col h-full">
          {/* App Title */}
          <div className={cn('flex items-center h-16 px-6', roleColor)}>
            <QrCode className="h-6 w-6 mr-2" />
            <span className="text-lg font-semibold">Attendance System</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            {/* User Info */}
            <div className="mb-4 px-3">
              <div className="text-sm text-gray-400">Signed in as</div>
              <div className="text-sm font-medium truncate">
                {authState.user?.email}
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      'hover:bg-gray-800 hover:text-white',
                      isActive ? 'bg-gray-800 text-white' : 'text-gray-400'
                    )
                  }
                >
                  <link.icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Logout Section */}
          <div className="mt-auto p-4 border-t border-gray-800">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      
    </>
  );
}
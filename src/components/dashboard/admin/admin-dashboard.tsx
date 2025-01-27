import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  BookOpen,
  Calendar,
  Bell,
  Settings,
  Download,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { QuickActions } from './quick-actions';
import { ImportCSV } from './import-csv';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';

interface DashboardStats {
  lecturers: number;
  students: number;
  classes: number;
  activeSessions: number;
  averageAttendance: number;
}

interface RecentActivity {
  id: string;
  type: 'login' | 'attendance' | 'class' | 'alert';
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

interface AttendanceData {
  date: string;
  attendance: number;
  total: number;
}

interface FilterOptions {
  dateRange: 'today' | 'week' | 'month' | 'all';
  activityType: 'all' | 'login' | 'attendance' | 'class' | 'alert';
  status: 'all' | 'success' | 'warning' | 'error';
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    lecturers: 0,
    students: 0,
    classes: 0,
    activeSessions: 0,
    averageAttendance: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    activityType: 'all',
    status: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time subscription for activity updates
    const activitySubscription = supabase
      .channel('activity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activitySubscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Get lecturer and student stats
      const [lecturerStats, studentStats] = await Promise.all([
        supabase.rpc('get_lecturers_with_stats'),
        supabase.rpc('get_students_with_stats'),
      ]);

      // Get classes and active sessions
      const [classes, sessions] = await Promise.all([
        supabase.from('classes').select('id'),
        supabase
          .from('class_sessions')
          .select('id')
          .eq('active', true)
          .gte('end_time', new Date().toISOString()),
      ]);

      // Get attendance stats
      const { data: attendanceStats } = await supabase.rpc('get_attendance_stats');

      setStats({
        lecturers: lecturerStats.data?.length || 0,
        students: studentStats.data?.length || 0,
        classes: classes.data?.length || 0,
        activeSessions: sessions.data?.length || 0,
        averageAttendance: Math.round(attendanceStats?.[0]?.average_attendance || 0),
      });

      // Fetch recent activity with filters
      await fetchRecentActivity();

      // Fetch attendance data for chart
      await fetchAttendanceData();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          marked_at,
          profiles!inner (
            full_name
          ),
          class_sessions!inner (
            classes (
              name
            )
          )
        `)
        .order('marked_at', { ascending: false });

      // Apply date filter
      if (filters.dateRange !== 'all') {
        const date = new Date();
        switch (filters.dateRange) {
          case 'today':
            query = query.gte('marked_at', format(date, 'yyyy-MM-dd'));
            break;
          case 'week':
            query = query.gte('marked_at', format(subDays(date, 7), 'yyyy-MM-dd'));
            break;
          case 'month':
            query = query.gte('marked_at', format(subDays(date, 30), 'yyyy-MM-dd'));
            break;
        }
      }

      const { data: activity } = await query;

      if (activity) {
        const filteredActivity = activity
          .map((record) => ({
            id: record.id,
            type: 'attendance' as const,
            description: `${record.profiles.full_name} marked attendance for ${record.class_sessions.classes.name}`,
            timestamp: record.marked_at,
            status: 'success' as const,
          }))
          .filter((item) => {
            if (filters.activityType !== 'all' && item.type !== filters.activityType) return false;
            if (filters.status !== 'all' && item.status !== filters.status) return false;
            if (searchQuery && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          });

        setRecentActivity(filteredActivity);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return {
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString(),
          month: format(date, 'MMM'),
        };
      }).reverse();

      const attendanceByMonth = await Promise.all(
        months.map(async ({ start, end, month }) => {
          const { data: sessions } = await supabase
            .from('class_sessions')
            .select(`
              id,
              attendance_records (count),
              classes!inner (
                class_enrollments (count)
              )
            `)
            .gte('start_time', start)
            .lte('end_time', end);

          const totalSessions = sessions?.length || 0;
          const totalEnrollments = sessions?.reduce(
            (acc, session) => acc + (session.classes.class_enrollments[0]?.count || 0),
            0
          ) || 0;
          const totalAttendances = sessions?.reduce(
            (acc, session) => acc + (session.attendance_records[0]?.count || 0),
            0
          ) || 0;

          return {
            date: month,
            attendance: totalAttendances,
            total: totalEnrollments,
          };
        })
      );

      setAttendanceData(attendanceByMonth);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select(`
          id,
          marked_at,
          profiles!inner (
            full_name,
            email
          ),
          class_sessions!inner (
            classes (
              name,
              course_code
            )
          )
        `)
        .order('marked_at', { ascending: false });

      if (!data) return;

      const csvContent = [
        ['Date', 'Time', 'Student Name', 'Student Email', 'Class', 'Course Code'].join(','),
        ...data.map((record) => [
          format(new Date(record.marked_at), 'yyyy-MM-dd'),
          format(new Date(record.marked_at), 'HH:mm:ss'),
          record.profiles.full_name,
          record.profiles.email,
          record.class_sessions.classes.name,
          record.class_sessions.classes.course_code,
        ].join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-10">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/admin/notifications')}
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Total Lecturers',
            value: stats.lecturers,
            icon: Users,
            color: 'bg-blue-500',
            trend: '+5%',
          },
          {
            label: 'Total Students',
            value: stats.students,
            icon: Users,
            color: 'bg-green-500',
            trend: '+12%',
          },
          {
            label: 'Active Classes',
            value: stats.classes,
            icon: BookOpen,
            color: 'bg-purple-500',
            trend: '+3%',
          },
          {
            label: 'Attendance Rate',
            value: `${stats.averageAttendance}%`,
            icon: CheckCircle,
            color: 'bg-yellow-500',
            trend: '+8%',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div
                  className={`h-12 w-12 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center`}
                >
                  <stat.icon
                    className={`h-6 w-6 ${stat.color.replace(
                      'bg',
                      'text'
                    )} text-opacity-90`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.trend.startsWith('+')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-2xl font-bold mt-4">{stat.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Attendance Overview</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="attendance"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="flex items-center space-x-2">
              <Input
                type="search"
                placeholder="Search activities..."
                className="w-64"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchRecentActivity();
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="form-select"
                  value={filters.dateRange}
                  onChange={(e) => {
                    setFilters({ ...filters, dateRange: e.target.value as any });
                    fetchRecentActivity();
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <select
                  className="form-select"
                  value={filters.activityType}
                  onChange={(e) => {
                    setFilters({ ...filters, activityType: e.target.value as any });
                    fetchRecentActivity();
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="login">Login</option>
                  <option value="attendance">Attendance</option>
                  <option value="class">Class</option>
                  <option value="alert">Alert</option>
                </select>
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value as any });
                    fetchRecentActivity();
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      activity.status === 'success'
                        ? 'bg-green-100'
                        : activity.status === 'warning'
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                    }`}
                  >
                    {activity.status === 'success' ? (
                      <CheckCircle
                        className={`h-5 w-5 ${
                          activity.status === 'success'
                            ? 'text-green-600'
                            : activity.status === 'warning'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      />
                    ) : activity.status === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {showImport && (
        <ImportCSV
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
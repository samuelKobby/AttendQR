import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  FileText,
  Users,
  Clock,
  CheckCircle,
  Bell,
  X,
  MapPin,
  QrCode,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO, isToday, isThisWeek } from 'date-fns';
import { toast } from 'sonner';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Input } from '@/components/ui/input';
import { AttendanceForm } from '@/components/attendance/attendance-form';
import { QRScanner } from '@/components/attendance/qr-scanner';
import { StudentAvatar } from '@/components/ui/student-avatar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface AttendanceRecord {
  id: string;
  date: string;
  class_name: string;
  status: 'present' | 'absent';
  marked_at?: string;
}

interface Class {
  id: string;
  name: string;
  course_code: string;
  schedule: string;
  location: string;
  attendance_rate: number;
  next_session?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  created_at: string;
  read: boolean;
}

interface ChartData {
  dailyAttendance: { date: string; present: number; absent: number }[];
  classPerformance: { name: string; attendance: number }[];
  weeklyProgress: { week: string; rate: number }[];
  overallStats: { name: string; value: number }[];
}

export function StudentDashboard() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<{
    sessionId: string;
    token: string;
  } | null>(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    averageAttendance: 0,
    presentCount: 0,
    absentCount: 0,
  });
  const [upcomingClasses, setUpcomingClasses] = useState<Class[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    status: 'all' as 'all' | 'present' | 'absent',
  });
  const [chartData, setChartData] = useState<ChartData>({
    dailyAttendance: [],
    classPerformance: [],
    weeklyProgress: [],
    overallStats: []
  });
  const { authState } = useAuth();
  const email = authState.user?.email || '';

  useEffect(() => {
    fetchAttendanceHistory();
    fetchClasses();
    fetchNotifications();
    fetchStats();
    fetchChartData();
  }, [authState.user?.id]);

  const fetchAttendanceHistory = async () => {
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select(`
          id,
          marked_at,
          class_sessions!inner (
            start_time,
            classes (
              name
            )
          )
        `)
        .eq('student_id', authState.user?.id)
        .order('marked_at', { ascending: false });

      if (data) {
        setAttendanceHistory(
          data.map((record) => {
            const markedTime = record.marked_at ? new Date(record.marked_at) : null;
            const status = markedTime ? 'present' : 'absent';

            return {
              id: record.id,
              date: record.class_sessions.start_time,
              class_name: record.class_sessions.classes.name,
              status,
              marked_at: record.marked_at,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await supabase
        .from('class_enrollments')
        .select(`
          classes (
            id,
            name,
            course_code,
            schedule,
            location,
            class_sessions (
              start_time,
              attendance_records (
                id,
                student_id
              )
            )
          )
        `)
        .eq('student_id', authState.user?.id);

      if (data) {
        const classesWithStats = data.map((enrollment) => {
          const cls = enrollment.classes;
          const sessions = cls.class_sessions || [];
          const totalSessions = sessions.length;
          const attendedSessions = sessions.filter((session) =>
            session.attendance_records.some((record) => record.student_id === authState.user?.id)
          ).length;

          const nextSession = sessions
            .map((s) => s.start_time)
            .filter((time) => new Date(time) > new Date())
            .sort()[0];

          return {
            id: cls.id,
            name: cls.name,
            course_code: cls.course_code,
            schedule: cls.schedule,
            location: cls.location,
            attendance_rate: totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0,
            next_session: nextSession,
          };
        });

        setClasses(classesWithStats);
        setUpcomingClasses(
          classesWithStats
            .filter((cls) => cls.next_session)
            .sort((a, b) => new Date(a.next_session!).getTime() - new Date(b.next_session!).getTime())
        );
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          attendance_records!left (
            id,
            student_id
          )
        `)
        .lte('start_time', new Date().toISOString());

      if (sessions) {
        const totalClasses = sessions.length;
        const presentCount = sessions.filter((session) =>
          session.attendance_records.some((record) => record.student_id === authState.user?.id)
        ).length;
        const absentCount = totalClasses - presentCount;
        const averageAttendance = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

        setStats({
          totalClasses,
          averageAttendance,
          presentCount,
          absentCount,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!authState.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authState.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (Array.isArray(data)) {
        setNotifications(data.filter(n => n && n.created_at));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const fetchChartData = async () => {
    if (!authState.user?.id) return;

    try {
      // Fetch attendance records for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          marked_at,
          class_sessions!inner (
            id,
            start_time,
            classes (
              id,
              name,
              course_code
            )
          )
        `)
        .eq('student_id', authState.user?.id)
        .gte('marked_at', thirtyDaysAgo.toISOString())
        .order('marked_at', { ascending: true });

      if (error) {
        console.error('Error fetching records:', error);
        return;
      }

      // Process daily attendance
      const dailyAttendanceMap = new Map();
      records?.forEach(record => {
        const date = format(parseISO(record.class_sessions.start_time), 'MMM d');
        const existing = dailyAttendanceMap.get(date) || { present: 0, absent: 0 };
        existing.present += 1;
        dailyAttendanceMap.set(date, existing);
      });

      const dailyAttendance = Array.from(dailyAttendanceMap.entries())
        .map(([date, stats]) => ({
          date,
          present: stats.present,
          absent: 0 // We'll calculate this after getting all sessions
        }))
        .slice(-7); // Last 7 days

      // Fetch all sessions to calculate absences
      const { data: allSessions } = await supabase
        .from('class_sessions')
        .select('start_time')
        .gte('start_time', thirtyDaysAgo.toISOString())
        .lte('start_time', new Date().toISOString());

      if (allSessions) {
        allSessions.forEach(session => {
          const date = format(parseISO(session.start_time), 'MMM d');
          const existing = dailyAttendanceMap.get(date);
          if (existing) {
            const sessionEntry = dailyAttendance.find(d => d.date === date);
            if (sessionEntry) {
              sessionEntry.absent = 1 - existing.present;
            }
          }
        });
      }

      // Process class performance
      const classPerformanceMap = new Map();
      records?.forEach(record => {
        const className = record.class_sessions.classes.name;
        const existing = classPerformanceMap.get(className) || { present: 0, total: 0 };
        existing.present += 1;
        existing.total += 1;
        classPerformanceMap.set(className, existing);
      });

      const classPerformance = Array.from(classPerformanceMap.entries())
        .map(([name, stats]) => ({
          name,
          attendance: Math.round((stats.present / stats.total) * 100)
        }));

      // Process weekly progress
      const weeklyProgressMap = new Map();
      records?.forEach(record => {
        const weekStart = format(parseISO(record.class_sessions.start_time), 'MMM d');
        const existing = weeklyProgressMap.get(weekStart) || { present: 0, total: 0 };
        existing.present += 1;
        existing.total += 1;
        weeklyProgressMap.set(weekStart, existing);
      });

      const weeklyProgress = Array.from(weeklyProgressMap.entries())
        .map(([week, stats]) => ({
          week,
          rate: Math.round((stats.present / stats.total) * 100)
        }))
        .slice(-4); // Last 4 weeks

      // Calculate overall stats
      const totalPresent = records?.length || 0;
      const totalSessions = allSessions?.length || 0;
      const totalAbsent = totalSessions - totalPresent;

      const chartData = {
        dailyAttendance,
        classPerformance,
        weeklyProgress,
        overallStats: [
          { name: 'Present', value: totalPresent },
          { name: 'Absent', value: totalAbsent }
        ]
      };

      setChartData(chartData);

    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData({
        dailyAttendance: [],
        classPerformance: [],
        weeklyProgress: [],
        overallStats: []
      });
    }
  };

  const markNotificationsAsRead = async () => {
    if (!authState.user?.id || notifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', authState.user.id)
        .in('id', notifications.map(n => n.id));

      if (error) {
        console.error('Error marking notifications as read:', error);
        return;
      }

      // Update local state to mark all notifications as read
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleScan = (data: { sessionId: string; token: string }) => {
    setScannedData(data);
    setShowScanner(false);
    setShowAttendanceForm(true);
  };

  const downloadAttendanceReport = async () => {
    try {
      // Fetch all attendance records for the student
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          marked_at,
          class_sessions (
            start_time,
            classes (
              name,
              course_code
            )
          )
        `)
        .eq('student_id', authState.user?.id)
        .order('marked_at', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Format the data for CSV
      const csvData = attendanceData?.map((record) => {
        const sessionDate = parseISO(record.class_sessions.start_time);
        const markedDate = parseISO(record.marked_at);
        const isOnTime = markedDate.getTime() - sessionDate.getTime() <= 15 * 60 * 1000;

        // Format date as text in a way Excel will recognize
        const dateStr = format(sessionDate, 'MM/dd/yyyy');
        const timeStr = format(markedDate, 'HH:mm:ss');

        return {
          class: record.class_sessions.classes.name.replace(/"/g, '""'), // Escape quotes in class names
          course_code: record.class_sessions.classes.course_code,
          date: dateStr,
          time: timeStr,
          status: isOnTime ? 'Present' : 'Absent',
        };
      });

      if (!csvData?.length) {
        throw new Error('No attendance records found');
      }

      // Create CSV content
      const headers = ['Class', 'Course Code', 'Date', 'Time', 'Status'];
      const csvContent = [
        headers.join(','),
        ...csvData.map((row) => [
          `"${row.class}"`,
          row.course_code,
          row.date,
          row.time,
          row.status,
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${format(new Date(), 'dd-MM-yyyy')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const filteredHistory = attendanceHistory.filter((record) => {
    const recordDate = new Date(record.date);
    const matchesStartDate = !filter.startDate || recordDate >= new Date(filter.startDate);
    const matchesEndDate = !filter.endDate || recordDate <= new Date(filter.endDate);
    const matchesStatus = filter.status === 'all' || record.status === filter.status;
    return matchesStartDate && matchesEndDate && matchesStatus;
  });

  const downloadHistory = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Class', 'Status', 'Time'];
      const rows = filteredHistory.map((record) => [
        format(new Date(record.date), 'MM/dd/yyyy'),
        record.class_name,
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
        record.marked_at ? format(new Date(record.marked_at), 'HH:mm:ss') : '-',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_history_${format(new Date(), 'dd-MM-yyyy')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading history:', error);
    }
  };

  return (
    <div className="h-full overflow-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Student Dashboard</h1>
          <p
            className="font-medium text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Welcome back, {authState.user?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm relative hover:bg-blue-500/15 hover:text-blue-600 hover:border-blue-500/25"
            onClick={() => {
              setShowNotifications(true);
              markNotificationsAsRead();
            }}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {notifications.filter((n) => !n.read).length}
            </span>
          </Button>
          <ProfileAvatar 
            email={email} 
            role="student" 
            onClick={() => setShowSettings(true)}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <Button
              onClick={() => setShowScanner(true)}
              className="w-full justify-start text-sm sm:text-base"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
            <Button
              className="w-full justify-start text-sm sm:text-base"
              variant="outline"
              onClick={() => setShowSchedule(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Schedule
            </Button>
            <Button
              className="w-full justify-start text-sm sm:text-base"
              variant="outline"
              onClick={downloadAttendanceReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Attendance Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Classes</span>
              <span className="font-medium">{stats.totalClasses}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Average Attendance</span>
              <span className="font-medium">
                {Math.round(stats.averageAttendance)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  stats.averageAttendance >= 90
                    ? 'bg-green-500'
                    : stats.averageAttendance >= 75
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${stats.averageAttendance}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-xs sm:text-sm">
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-600">
                  {stats.presentCount}
                </div>
                <div className="text-green-600">Present</div>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <div className="font-medium text-red-600">
                  {stats.absentCount}
                </div>
                <div className="text-red-600">Absent</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Upcoming Classes</h2>
          <div className="space-y-3 sm:space-y-4">
            {upcomingClasses.length > 0 ? (
              upcomingClasses.slice(0, 3).map((cls) => (
                <div
                  key={cls.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
                >
                  <div>
                    <p className="font-medium text-sm sm:text-base">{cls.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{cls.schedule}</p>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {cls.next_session &&
                      format(parseISO(cls.next_session), 'MMM d, HH:mm')}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">No upcoming classes</p>
            )}
          </div>
        </div>
      </div>
      

       {/* Charts Section */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Daily Attendance */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Attendance</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.dailyAttendance} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Sessions']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px'
                  }}
                />
                <Legend />
                <Bar dataKey="present" name="Present" fill="#3b82f6" />
                <Bar dataKey="absent" name="Absent" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Overall Stats */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Overall Attendance</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <Pie
                  data={chartData.overallStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${((entry.value / chartData.overallStats.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%`}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#f87171" />
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} sessions`, name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Performance */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Class Performance</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.classPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  interval={0}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  name="Attendance Rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Weekly Progress</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.weeklyProgress} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  interval={0}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Attendance Rate']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="rate"
                  name="Attendance Rate"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        {/* Attendance History */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className="text-base sm:text-lg font-semibold">Recent Attendance</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {filteredHistory.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
              >
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {record.status === 'present' ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm sm:text-base truncate">
                      {record.class_name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {format(parseISO(record.date), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 sm:px-2 sm:py-1 text-xs sm:text-sm rounded-full ${
                    record.status === 'present'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

     

  
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}

      {showAttendanceForm && scannedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <AttendanceForm
              sessionId={scannedData.sessionId}
              token={scannedData.token}
              onClose={() => setShowAttendanceForm(false)}
            />
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Notifications</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg ${
                      notification.read ? 'bg-gray-50' : 'bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {notification.type === 'warning' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : notification.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-500" />
                      )}
                      <h3 className="font-medium">{notification.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {format(parseISO(notification.created_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No notifications</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Profile Information</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6">
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      value={authState.user?.name || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID
                    </label>
                    <Input
                      type="text"
                      value={authState.user?.id || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={authState.user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    supabase.auth.signOut();
                    setShowSettings(false);
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Class Schedule</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSchedule(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-gray-50 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.course_code}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {cls.next_session && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          Next: {format(parseISO(cls.next_session), 'MMM d, HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {cls.schedule}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {cls.location}
                  </div>
                </div>
              ))}
              {classes.length === 0 && (
                <p className="text-center text-gray-500">No classes found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Filter Attendance</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowFilter(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filter.startDate}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filter.endDate}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filter.status}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      status: e.target.value as 'all' | 'present' | 'absent',
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilter({
                      startDate: '',
                      endDate: '',
                      status: 'all',
                    })
                  }
                >
                  Reset
                </Button>
                <Button onClick={() => setShowFilter(false)}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
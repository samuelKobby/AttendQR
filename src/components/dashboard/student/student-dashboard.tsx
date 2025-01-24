import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  BookOpen,
  Calendar,
  Bell,
  Download,
  AlertCircle,
  ChevronDown,
  Filter,
  BarChart3,
  Settings,
} from 'lucide-react';
import { AttendanceForm } from '@/components/attendance/attendance-form';
import { QRScanner } from '@/components/attendance/qr-scanner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO, isToday, isThisWeek } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AttendanceRecord {
  id: string;
  date: string;
  class_name: string;
  status: 'present' | 'late' | 'absent';
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
  timestamp: string;
  read: boolean;
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
    lateCount: 0,
    absentCount: 0,
  });
  const [upcomingClasses, setUpcomingClasses] = useState<Class[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchAttendanceHistory();
    fetchClasses();
    fetchNotifications();
    fetchStats();
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
            const sessionStart = new Date(record.class_sessions.start_time);
            const markedTime = record.marked_at ? new Date(record.marked_at) : null;
            let status: 'present' | 'late' | 'absent' = 'absent';

            if (markedTime) {
              const timeDiff = markedTime.getTime() - sessionStart.getTime();
              status = timeDiff <= 15 * 60 * 1000 ? 'present' : 'late';
            }

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
          const attendedSessions = sessions.filter(session =>
            session.attendance_records.some(record => record.student_id === authState.user?.id)
          ).length;

          const nextSession = sessions
            .map(s => s.start_time)
            .filter(time => new Date(time) > new Date())
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
            .filter(cls => cls.next_session)
            .sort((a, b) => new Date(a.next_session!).getTime() - new Date(b.next_session!).getTime())
        );
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Get enrolled classes first
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', authState.user?.id);

      if (!enrollments || enrollments.length === 0) {
        setStats({
          totalClasses: 0,
          averageAttendance: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
        });
        return;
      }

      const classIds = enrollments.map(e => e.class_id);

      // Get sessions for enrolled classes
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          attendance_records (
            id,
            marked_at
          )
        `)
        .in('class_id', classIds);

      if (!sessions) {
        throw new Error('Failed to fetch sessions');
      }

      let present = 0;
      let late = 0;
      let absent = 0;

      sessions.forEach(session => {
        const record = session.attendance_records.find(
          r => r.marked_at
        );

        if (!record) {
          absent++;
        } else {
          const sessionStart = new Date(session.start_time);
          const markedTime = new Date(record.marked_at);
          const timeDiff = markedTime.getTime() - sessionStart.getTime();
          
          if (timeDiff <= 15 * 60 * 1000) {
            present++;
          } else {
            late++;
          }
        }
      });

      const total = present + late + absent;
      setStats({
        totalClasses: total,
        averageAttendance: total > 0 ? ((present + late) / total) * 100 : 0,
        presentCount: present,
        lateCount: late,
        absentCount: absent,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default values on error
      setStats({
        totalClasses: 0,
        averageAttendance: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
      });
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authState.user?.id)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Set empty array on error
    }
  };

  const handleScan = (data: { sessionId: string; token: string }) => {
    setScannedData(data);
    setShowScanner(false);
    setShowAttendanceForm(true);
  };

  const handleDownloadCertificate = async (classId: string) => {
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('name, course_code')
        .eq('id', classId)
        .single();

      if (!classData) return;

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('count')
        .eq('student_id', authState.user?.id)
        .in(
          'session_id',
          supabase
            .from('class_sessions')
            .select('id')
            .eq('class_id', classId)
        );

      const totalSessions = attendanceData?.length || 0;
      const attendanceRate = totalSessions > 0 ? (attendanceData?.length || 0) / totalSessions * 100 : 0;

      // Generate certificate content
      const certificateContent = `
        ATTENDANCE CERTIFICATE
        
        This is to certify that ${authState.user?.name}
        has attended ${classData.name} (${classData.course_code})
        with an attendance rate of ${Math.round(attendanceRate)}%
        
        Date: ${format(new Date(), 'MMMM d, yyyy')}
      `;

      // Create and download file
      const blob = new Blob([certificateContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_certificate_${classData.course_code}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating certificate:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Student Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {authState.user?.name}
          </p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 mr-2" />
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {notifications.filter(n => !n.read).length}
            </span>
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
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
            <Button className="w-full justify-start text-sm sm:text-base" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              View Schedule
            </Button>
            <Button className="w-full justify-start text-sm sm:text-base" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
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
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-600">
                  {stats.presentCount}
                </div>
                <div className="text-green-600">Present</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <div className="font-medium text-yellow-600">
                  {stats.lateCount}
                </div>
                <div className="text-yellow-600">Late</div>
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

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
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
              <p className="text-center text-gray-500 text-sm">No upcoming classes</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        {/* Attendance History */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className="text-base sm:text-lg font-semibold">Recent Attendance</h2>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="px-2 sm:px-3">
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {attendanceHistory.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2"
              >
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {record.status === 'present' ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  ) : record.status === 'late' ? (
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
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
                      : record.status === 'late'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold">Notifications</h2>
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 sm:p-4 rounded-lg ${
                  notification.read ? 'bg-gray-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {notification.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  ) : notification.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  ) : (
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  )}
                  <h3 className="font-medium text-sm sm:text-base">{notification.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {format(parseISO(notification.timestamp), 'MMM d, HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enrolled Classes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">My Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-6 bg-gray-50 rounded-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div
                  className="h-12 w-12 bg-blue-500 bg-opacity-10 rounded-lg 
                  flex items-center justify-center"
                >
                  <BookOpen className="h-6 w-6 text-blue-500" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadCertificate(cls.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <h3 className="font-medium">{cls.name}</h3>
                <p className="text-sm text-gray-500">{cls.course_code}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {cls.schedule}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Attendance Rate</span>
                  <span className="font-medium">
                    {Math.round(cls.attendance_rate)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      cls.attendance_rate >= 90
                        ? 'bg-green-500'
                        : cls.attendance_rate >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${cls.attendance_rate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}
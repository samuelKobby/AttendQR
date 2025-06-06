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
} from 'lucide-react';
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
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface AttendanceData {
  month: string;
  attendance: number;
}

interface ClassData {
  name: string;
  students: number;
  attendance: number;
}

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface AttendanceReport {
  id: string;
  student_id: string;
  student_name: string;
  school_student_id: string;
  marked_at: string;
  class_session: {
    start_time: string;
    class: {
      name: string;
      course_code: string;
    };
  };
}

interface SessionWithEnrollments {
  id: string;
  class: {
    class_enrollments: Array<{ count: number }>;
  };
  attendance_records: Array<{ count: number }>;
}

interface SessionWithAttendance {
  id: string;
  start_time: string;
  class: {
    class_enrollments: Array<{ count: number }>;
  };
  attendance_records: Array<{
    marked_at: string;
  }>;
}

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [pieData, setPieData] = useState<PieData[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageAttendance: 0,
    totalClasses: 0,
    totalSessions: 0,
    changes: {
      students: '0%',
      attendance: '0%',
      classes: '0',
      sessions: '0%'
    }
  });
  const [classes, setClasses] = useState<Class[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    startOfMonth(new Date()),
    endOfMonth(new Date())
  ]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    fetchAttendanceData();
    fetchClassData();
    fetchAttendanceDistribution();
    fetchClasses();
    fetchReports();
  }, [authState.user?.id, selectedPeriod]);

  const fetchStats = async () => {
    try {
      console.log('Fetching stats for date range:', dateRange);
      
      // Get current period stats
      const { data: currentClasses } = await supabase
        .from('classes')
        .select(`
          id,
          class_enrollments!inner (
            student_id
          ),
          class_sessions!inner (
            id,
            start_time,
            attendance_records (
              student_id
            )
          )
        `)
        .eq('lecturer_id', authState.user?.id);

      // Get previous period stats for comparison
      const previousStart = new Date(dateRange[0]);
      previousStart.setMonth(previousStart.getMonth() - 1);
      const previousEnd = new Date(dateRange[1]);
      previousEnd.setMonth(previousEnd.getMonth() - 1);

      const { data: previousClasses } = await supabase
        .from('classes')
        .select(`
          id,
          class_enrollments (
            student_id
          ),
          class_sessions (
            id,
            start_time,
            attendance_records (
              student_id
            )
          )
        `)
        .eq('lecturer_id', authState.user?.id);

      // Calculate current period stats
      const currentStats = {
        totalStudents: 0,
        totalAttendances: 0,
        totalSessions: 0
      };

      if (currentClasses) {
        // Calculate unique students across all classes
        const allStudents = new Set();
        currentClasses.forEach(cls => {
          cls.class_enrollments.forEach(enrollment => {
            allStudents.add(enrollment.student_id);
          });
        });
        currentStats.totalStudents = allStudents.size;

        // Calculate sessions and attendance in date range
        currentClasses.forEach(cls => {
          const sessionsInRange = cls.class_sessions.filter(session => {
            const sessionDate = new Date(session.start_time);
            return sessionDate >= dateRange[0] && sessionDate <= dateRange[1];
          });
          currentStats.totalSessions += sessionsInRange.length;
          currentStats.totalAttendances += sessionsInRange.reduce(
            (acc, session) => acc + (session.attendance_records?.length || 0),
            0
          );
        });
      }

      // Calculate previous period stats
      const previousStats = {
        totalStudents: 0,
        totalAttendances: 0,
        totalSessions: 0
      };

      if (previousClasses) {
        const allStudents = new Set();
        previousClasses.forEach(cls => {
          cls.class_enrollments?.forEach(enrollment => {
            allStudents.add(enrollment.student_id);
          });
        });
        previousStats.totalStudents = allStudents.size;

        previousClasses.forEach(cls => {
          const sessionsInRange = cls.class_sessions?.filter(session => {
            const sessionDate = new Date(session.start_time);
            return sessionDate >= previousStart && sessionDate <= previousEnd;
          }) || [];
          previousStats.totalSessions += sessionsInRange.length;
          previousStats.totalAttendances += sessionsInRange.reduce(
            (acc, session) => acc + (session.attendance_records?.length || 0),
            0
          );
        });
      }

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
      };

      const calculateAbsoluteChange = (current: number, previous: number) => {
        const change = current - previous;
        return change > 0 ? `+${change}` : `${change}`;
      };

      // Calculate average attendance
      const averageAttendance = currentStats.totalSessions > 0 && currentStats.totalStudents > 0
        ? (currentStats.totalAttendances / (currentStats.totalSessions * currentStats.totalStudents)) * 100
        : 0;

      const previousAvgAttendance = previousStats.totalSessions > 0 && previousStats.totalStudents > 0
        ? (previousStats.totalAttendances / (previousStats.totalSessions * previousStats.totalStudents)) * 100
        : 0;

      setStats({
        totalStudents: currentStats.totalStudents,
        averageAttendance: Math.round(averageAttendance),
        totalClasses: currentClasses?.length || 0,
        totalSessions: currentStats.totalSessions,
        changes: {
          students: calculateChange(currentStats.totalStudents, previousStats.totalStudents),
          attendance: calculateChange(averageAttendance, previousAvgAttendance),
          classes: calculateAbsoluteChange(currentClasses?.length || 0, previousClasses?.length || 0),
          sessions: calculateChange(currentStats.totalSessions, previousStats.totalSessions)
        }
      });

      console.log('Stats calculated:', {
        current: currentStats,
        previous: previousStats,
        changes: stats.changes
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error fetching statistics",
        description: "Please try again later",
        variant: "destructive"
      });
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
              class:classes!inner (
                class_enrollments (count)
              ),
              attendance_records (count)
            `)
            .eq('lecturer_id', authState.user?.id)
            .gte('start_time', start)
            .lte('end_time', end) as { data: SessionWithEnrollments[] | null };

          if (!sessions?.length) return { month, attendance: 0 };

          const totalAttendances = sessions.reduce(
            (acc, session) => acc + (session.attendance_records[0]?.count || 0),
            0
          );

          const totalExpectedAttendances = sessions.reduce(
            (acc, session) => acc + (session.class.class_enrollments[0]?.count || 0),
            0
          );

          const rate = totalExpectedAttendances > 0
            ? (totalAttendances / totalExpectedAttendances) * 100
            : 0;

          return {
            month,
            attendance: Math.round(rate),
          };
        })
      );

      setAttendanceData(attendanceByMonth);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast({
        title: "Error fetching attendance data",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const fetchClassData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching class data for date range:', dateRange);

      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          course_code,
          class_enrollments!inner (
            student_id
          ),
          class_sessions!inner (
            id,
            start_time,
            attendance_records (
              id,
              student_id
            )
          )
        `)
        .eq('lecturer_id', authState.user?.id);

      if (error) {
        console.error('Error fetching class data:', error);
        toast({
          title: "Error fetching class data",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('Raw class data:', classes);

      const formattedClassData = classes.map(cls => {
        const totalStudents = new Set(cls.class_enrollments.map(e => e.student_id)).size;
        
        // Filter sessions within date range
        const sessionsInRange = cls.class_sessions.filter(session => {
          const sessionDate = new Date(session.start_time);
          return sessionDate >= dateRange[0] && sessionDate <= dateRange[1];
        });

        const totalSessions = sessionsInRange.length;
        const totalAttendances = sessionsInRange.reduce(
          (acc, session) => acc + (session.attendance_records?.length || 0),
          0
        );

        const attendanceRate = totalSessions > 0 && totalStudents > 0
          ? (totalAttendances / (totalSessions * totalStudents)) * 100
          : 0;

        console.log(`Class ${cls.name} stats:`, {
          totalStudents,
          totalSessions,
          totalAttendances,
          attendanceRate
        });

        return {
          name: `${cls.name} (${cls.course_code})`,
          students: totalStudents,
          attendance: Math.round(attendanceRate)
        };
      });

      console.log('Formatted class data:', formattedClassData);
      setClassData(formattedClassData);
    } catch (error) {
      console.error('Error in fetchClassData:', error);
      toast({
        title: "Error processing class data",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceDistribution = async () => {
    try {
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          class:classes!inner (
            class_enrollments (count)
          ),
          attendance_records (
            marked_at
          )
        `)
        .eq('lecturer_id', authState.user?.id)
        .gte('start_time', dateRange[0].toISOString())
        .lte('end_time', dateRange[1].toISOString()) as { data: SessionWithAttendance[] | null };

      if (sessions) {
        let present = 0;
        let late = 0;
        let absent = 0;

        sessions.forEach(session => {
          const sessionStart = new Date(session.start_time);
          const lateThreshold = new Date(sessionStart.getTime() + 15 * 60000); // 15 minutes
          const totalExpected = session.class.class_enrollments[0]?.count || 0;

          session.attendance_records.forEach(record => {
            const markedTime = new Date(record.marked_at);
            if (markedTime <= sessionStart) {
              present++;
            } else if (markedTime <= lateThreshold) {
              late++;
            }
          });

          absent += totalExpected - session.attendance_records.length;
        });

        const total = present + late + absent;
        if (total > 0) {
          setPieData([
            { name: 'Present', value: Math.round((present / total) * 100), color: '#22c55e' },
            { name: 'Late', value: Math.round((late / total) * 100), color: '#eab308' },
            { name: 'Absent', value: Math.round((absent / total) * 100), color: '#ef4444' },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance distribution:', error);
      toast({
        title: "Error fetching attendance distribution",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('lecturer_id', authState.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchReports = async () => {
    try {
      // First, get all class sessions with their enrolled students
      const { data: sessions, error: sessionError } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          class:classes (
            id,
            name,
            course_code,
            class_enrollments (
              student_id,
              profiles (
                full_name,
                school_student_id
              )
            )
          ),
          attendance_records (
            id,
            student_id,
            marked_at
          )
        `)
        .eq('lecturer_id', authState.user?.id)
        .order('start_time', { ascending: false });

      if (sessionError) throw sessionError;

      // Transform the data to include all enrolled students with their attendance status
      const allReports = sessions?.flatMap(session => {
        const enrolledStudents = session.class.class_enrollments;
        
        return enrolledStudents.map(enrollment => {
          const studentProfile = enrollment.profiles;
          const attendanceRecord = session.attendance_records.find(
            record => record.student_id === enrollment.student_id
          );

          return {
            id: attendanceRecord?.id || `no-attendance-${session.id}-${enrollment.student_id}`,
            student_id: enrollment.student_id,
            student_name: studentProfile.full_name,
            school_student_id: studentProfile.school_student_id,
            marked_at: attendanceRecord?.marked_at || null,
            class_session: {
              start_time: session.start_time,
              class: {
                name: session.class.name,
                course_code: session.class.course_code
              }
            }
          };
        });
      }) || [];

      setReports(allReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error fetching attendance reports",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const exportReport = () => {
    try {
      // Create CSV headers
      const headers = [
        'Date',
        'Time',
        'Class',
        'Course Code',
        'Student Name',
        'School ID',
        'Status'
      ];

      // Create CSV rows
      const rows = reports.map(report => {
        const sessionDate = new Date(report.class_session.start_time);
        const status = report.marked_at
          ? (() => {
              const markedTime = new Date(report.marked_at);
              const timeDiff = markedTime.getTime() - sessionDate.getTime();
              return timeDiff <= 15 * 60 * 1000 ? 'Present' : 'Late';
            })()
          : 'Absent';

        return [
          format(sessionDate, 'MM/dd/yyyy'),
          format(sessionDate, 'hh:mm a'),
          report.class_session.class.name,
          report.class_session.class.course_code,
          report.student_name,
          report.school_student_id,
          status
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${format(new Date(), 'MM-dd-yyyy')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        variant: "success",
        title: "Report Exported Successfully",
        description: "The attendance report has been downloaded as a CSV file",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error exporting the attendance report",
      });
    }
  };

  useEffect(() => {
    fetchClassData();
  }, [dateRange, authState.user?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-10 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">View detailed attendance reports and analytics</p>
        </div>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto"
          onClick={exportReport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Class
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedClass || ''}
              onChange={(e) => setSelectedClass(e.target.value || null)}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={dateRange[0].toISOString().split('T')[0] || ''}
                onChange={(e) =>
                  setDateRange([new Date(e.target.value), dateRange[1]])
                }
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={dateRange[1].toISOString().split('T')[0] || ''}
                onChange={(e) =>
                  setDateRange([dateRange[0], new Date(e.target.value)])
                }
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Students',
            value: stats.totalStudents.toString(),
            change: stats.changes.students,
            icon: Users,
            color: 'bg-blue-500',
          },
          {
            title: 'Average Attendance',
            value: `${stats.averageAttendance}%`,
            change: stats.changes.attendance,
            icon: BarChart3,
            color: 'bg-green-500',
          },
          {
            title: 'Total Classes',
            value: stats.totalClasses.toString(),
            change: stats.changes.classes,
            icon: Clock,
            color: 'bg-purple-500',
          },
          {
            title: 'Sessions Conducted',
            value: stats.totalSessions.toString(),
            change: stats.changes.sessions,
            icon: CheckCircle,
            color: 'bg-yellow-500',
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-lg shadow-lg transition-shadow duration-200"
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
                <span className="text-sm font-medium text-green-600">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold mt-4">{stat.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Attendance Trend</h2>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#6366f1"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Distribution */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Attendance Distribution</h2>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Class Performance */}
      <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Class Performance</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const now = new Date();
                setDateRange([
                  startOfMonth(now),
                  endOfMonth(now)
                ]);
                toast({
                  title: "Date range updated",
                  description: "Showing data for current month"
                });
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              This Month
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const now = new Date();
                setDateRange([
                  startOfMonth(subMonths(now, 1)),
                  endOfMonth(subMonths(now, 1))
                ]);
                toast({
                  title: "Date range updated",
                  description: "Showing data for last month"
                });
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Last Month
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading class data...
                  </td>
                </tr>
              ) : classData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No classes found for the selected period
                  </td>
                </tr>
              ) : (
                classData.map((cls) => (
                  <tr key={cls.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cls.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cls.students}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cls.attendance}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            cls.attendance >= 90
                              ? 'bg-green-500'
                              : cls.attendance >= 75
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${cls.attendance}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Data Available</h3>
          <p className="mt-2 text-sm text-gray-500">
            Start taking attendance to generate reports
          </p>
        </div>
      )}
    </div>
  );
}
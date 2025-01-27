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
  });
  const [classes, setClasses] = useState<Class[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    startOfMonth(new Date()),
    endOfMonth(new Date())
  ]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
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
      // Get total students across all classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .in(
          'class_id',
          supabase
            .from('classes')
            .select('id')
            .eq('lecturer_id', authState.user?.id)
        );

      // Get total classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('lecturer_id', authState.user?.id);

      // Get total sessions and attendance
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select(`
          id,
          attendance_records (count)
        `)
        .eq('lecturer_id', authState.user?.id);

      const totalStudents = new Set(enrollments?.map(e => e.student_id)).size;
      const totalSessions = sessions?.length || 0;
      const totalAttendances = sessions?.reduce(
        (acc, session) => acc + (session.attendance_records[0]?.count || 0),
        0
      ) || 0;

      const averageAttendance = totalSessions > 0
        ? (totalAttendances / (totalSessions * totalStudents)) * 100
        : 0;

      setStats({
        totalStudents,
        averageAttendance: Math.round(averageAttendance),
        totalClasses: classes?.length || 0,
        totalSessions,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
              attendance_records (count)
            `)
            .eq('lecturer_id', authState.user?.id)
            .gte('start_time', start)
            .lte('end_time', end);

          const totalSessions = sessions?.length || 0;
          const totalAttendances = sessions?.reduce(
            (acc, session) => acc + (session.attendance_records[0]?.count || 0),
            0
          ) || 0;

          const rate = totalSessions > 0
            ? (totalAttendances / (totalSessions * stats.totalStudents)) * 100
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
    }
  };

  const fetchClassData = async () => {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          class_enrollments (count),
          class_sessions (
            id,
            attendance_records (count)
          )
        `)
        .eq('lecturer_id', authState.user?.id);

      if (error) {
        console.error('Error fetching class data:', error);
        return;
      }

      const formattedClassData = await Promise.all(
        classes.map(async (cls) => {
          // Get total students in class
          const { data: enrollments } = await supabase
            .from('class_enrollments')
            .select('count')
            .eq('class_id', cls.id)
            .single();

          // Get attendance records within date range
          const { data: sessions } = await supabase
            .from('class_sessions')
            .select(`
              id,
              attendance_records (count)
            `)
            .eq('class_id', cls.id)
            .gte('start_time', dateRange[0].toISOString())
            .lte('end_time', dateRange[1].toISOString());

          const totalStudents = enrollments?.count || 0;
          const totalSessions = sessions?.length || 0;
          const totalAttendances = sessions?.reduce(
            (acc, session) => acc + (session.attendance_records[0]?.count || 0),
            0
          ) || 0;

          const attendanceRate = totalSessions > 0 && totalStudents > 0
            ? (totalAttendances / (totalSessions * totalStudents)) * 100
            : 0;

          return {
            name: cls.name,
            students: totalStudents,
            attendance: Math.round(attendanceRate)
          };
        })
      );

      setClassData(formattedClassData);
    } catch (error) {
      console.error('Error in fetchClassData:', error);
    }
  };

  const fetchAttendanceDistribution = async () => {
    try {
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          attendance_records (
            marked_at
          )
        `)
        .eq('lecturer_id', authState.user?.id);

      if (sessions) {
        let present = 0;
        let late = 0;
        let absent = 0;

        sessions.forEach(session => {
          const sessionStart = new Date(session.start_time);
          const lateThreshold = new Date(sessionStart.getTime() + 15 * 60000); // 15 minutes

          session.attendance_records.forEach(record => {
            const markedTime = new Date(record.marked_at);
            if (markedTime <= sessionStart) {
              present++;
            } else if (markedTime <= lateThreshold) {
              late++;
            }
          });

          // Calculate absences based on total enrolled students
          const totalExpected = stats.totalStudents;
          absent += totalExpected - session.attendance_records.length;
        });

        const total = present + late + absent;
        setPieData([
          { name: 'Present', value: (present / total) * 100, color: '#22c55e' },
          { name: 'Late', value: (late / total) * 100, color: '#eab308' },
          { name: 'Absent', value: (absent / total) * 100, color: '#ef4444' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching attendance distribution:', error);
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
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          student_name,
          school_student_id,
          marked_at,
          class_session:class_sessions!inner (
            start_time,
            class:classes (
              name,
              course_code
            )
          )
        `)
        .order('marked_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
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
        const markedTime = new Date(report.marked_at);
        const timeDiff = markedTime.getTime() - sessionDate.getTime();
        const status = timeDiff <= 15 * 60 * 1000 ? 'Present' : 'Late';

        return [
          format(sessionDate, 'MM/dd/yyyy'),
          format(markedTime, 'hh:mm a'),
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
            change: '+12%',
            icon: Users,
            color: 'bg-blue-500',
          },
          {
            title: 'Average Attendance',
            value: `${stats.averageAttendance}%`,
            change: '+5%',
            icon: BarChart3,
            color: 'bg-green-500',
          },
          {
            title: 'Total Classes',
            value: stats.totalClasses.toString(),
            change: '+1',
            icon: Clock,
            color: 'bg-purple-500',
          },
          {
            title: 'Sessions Conducted',
            value: stats.totalSessions.toString(),
            change: '+8%',
            icon: CheckCircle,
            color: 'bg-yellow-500',
          },
        ].map((stat) => (
          <div
            key={stat.title}
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
        <div className="bg-white rounded-lg shadow-sm p-6">
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
        <div className="bg-white rounded-lg shadow-sm p-6">
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
      <div className="bg-white rounded-lg shadow-sm p-6">
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
              {classData.map((cls) => (
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
              ))}
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
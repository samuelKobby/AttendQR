import { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Users,
  BookOpen,
  ChevronDown,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface AttendanceData {
  month: string;
  attendance: number;
}

interface ClassData {
  name: string;
  students: number;
  attendance: number;
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface DashboardStats {
  totalStudents: number;
  averageAttendance: number;
  activeClasses: number;
  totalSessions: number;
  studentGrowth: number;
  attendanceGrowth: number;
  classGrowth: number;
  sessionGrowth: number;
}

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    averageAttendance: 0,
    activeClasses: 0,
    totalSessions: 0,
    studentGrowth: 0,
    attendanceGrowth: 0,
    classGrowth: 0,
    sessionGrowth: 0
  });

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedClass]);

  const fetchReportData = async () => {
    try {
      // Get total students and growth
      const [{ count: currentStudents }, { count: lastMonthStudents }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .lt('created_at', startOfMonth(new Date()).toISOString())
      ]);

      // Get active classes and sessions
      const [{ count: activeClasses }, { count: totalSessions }] = await Promise.all([
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('class_sessions').select('*', { count: 'exact', head: true })
      ]);

      // Get attendance data for the past 6 months
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return {
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString(),
          month: format(date, 'MMM')
        };
      }).reverse();

      const monthlyAttendance = await Promise.all(
        months.map(async ({ start, end, month }) => {
          const { data: sessions } = await supabase
            .from('class_sessions')
            .select('id, attendance_records(count)')
            .gte('date', start)
            .lte('date', end);

          const totalSessions = sessions?.length || 0;
          const totalAttendance = sessions?.reduce(
            (sum, session) => sum + (session.attendance_records[0]?.count || 0),
            0
          ) || 0;

          return {
            month,
            attendance: totalSessions > 0 ? Math.round((totalAttendance / totalSessions) * 100) : 0
          };
        })
      );

      // Get class-wise attendance
      const { data: classes } = await supabase
        .from('classes')
        .select(`
          name,
          class_enrollments(count),
          class_sessions(
            attendance_records(count)
          )
        `)
        .eq('active', true)
        .limit(5);

      const classStats = classes?.map(cls => ({
        name: cls.name,
        students: cls.class_enrollments[0]?.count || 0,
        attendance: cls.class_sessions.reduce((sum, session) => 
          sum + (session.attendance_records[0]?.count || 0), 0
        )
      })) || [];

      // Calculate attendance distribution
      const { data: recentSessions } = await supabase
        .from('class_sessions')
        .select('attendance_records(status)')
        .gte('date', startOfMonth(new Date()).toISOString());

      const distribution = {
        present: 0,
        late: 0,
        absent: 0
      };

      recentSessions?.forEach(session => {
        session.attendance_records.forEach((record: any) => {
          if (record.status === 'present') distribution.present++;
          else if (record.status === 'late') distribution.late++;
          else distribution.absent++;
        });
      });

      const total = distribution.present + distribution.late + distribution.absent;
      
      setStats({
        totalStudents: currentStudents || 0,
        averageAttendance: monthlyAttendance[monthlyAttendance.length - 1]?.attendance || 0,
        activeClasses: activeClasses || 0,
        totalSessions: totalSessions || 0,
        studentGrowth: lastMonthStudents ? ((currentStudents - lastMonthStudents) / lastMonthStudents) * 100 : 0,
        attendanceGrowth: 0, // Calculate based on previous month
        classGrowth: 0, // Calculate based on previous month
        sessionGrowth: 0 // Calculate based on previous month
      });

      setAttendanceData(monthlyAttendance);
      setClassData(classStats);
      setDistributionData([
        { name: 'Present', value: (distribution.present / total) * 100, color: '#22c55e' },
        { name: 'Late', value: (distribution.late / total) * 100, color: '#eab308' },
        { name: 'Absent', value: (distribution.absent / total) * 100, color: '#ef4444' }
      ]);

    } catch (error) {
      console.error('Error fetching report data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-10">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">
            View detailed attendance reports and analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {selectedPeriod}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            {selectedClass}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Students',
            value: stats.totalStudents.toString(),
            change: `${stats.studentGrowth}%`,
            icon: Users,
            color: 'bg-blue-500',
          },
          {
            title: 'Average Attendance',
            value: `${stats.averageAttendance}%`,
            change: `${stats.attendanceGrowth}%`,
            icon: BarChart3,
            color: 'bg-green-500',
          },
          {
            title: 'Active Classes',
            value: stats.activeClasses.toString(),
            change: `${stats.classGrowth}%`,
            icon: BookOpen,
            color: 'bg-purple-500',
          },
          {
            title: 'Total Sessions',
            value: stats.totalSessions.toString(),
            change: `${stats.sessionGrowth}%`,
            icon: Clock,
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
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
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
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Detailed Report
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
                    <div className="text-sm text-gray-900">{cls.students}</div>
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
    </div>
  );
}
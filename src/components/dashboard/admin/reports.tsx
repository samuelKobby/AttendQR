import { useState, useEffect, useRef } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AttendanceData {
  month: string;
  attendance: number;
  totalStudents: number;
  sessions: number;
  activeClasses: number;
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
  morningSessions: number;
  afternoonSessions: number;
  eveningSessions: number;
  completedSessions: number;
  upcomingSessions: number;
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
    sessionGrowth: 0,
    morningSessions: 0,
    afternoonSessions: 0,
    eveningSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0
  });
  const [isExporting, setIsExporting] = useState(false);

  const chartsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const exportReport = async () => {
    if (!chartsRef.current) return;

    try {
      setIsExporting(true);
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yOffset = 20;

      // Add title
      pdf.setFontSize(20);
      pdf.text('Attendance Report', pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 15;

      // Add generation date
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${format(new Date(), 'PPP')}`, pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 20;

      // Add overview section
      pdf.setFontSize(16);
      pdf.text('Overview', 20, yOffset);
      yOffset += 10;

      pdf.setFontSize(12);
      const overviewData = [
        ['Total Students', stats.totalStudents.toString()],
        ['Average Attendance', `${stats.averageAttendance}%`],
        ['Active Classes', stats.activeClasses.toString()],
        ['Total Sessions', stats.totalSessions.toString()],
      ];

      overviewData.forEach(([label, value]) => {
        pdf.text(`${label}: ${value}`, 30, yOffset);
        yOffset += 8;
      });
      yOffset += 10;

      // Capture and add charts
      const charts = chartsRef.current;
      const canvas = await html2canvas(charts);
      const imgData = canvas.toDataURL('image/png');
      
      // Add charts section title
      pdf.setFontSize(16);
      pdf.text('Analytics', 20, yOffset);
      yOffset += 10;

      // Calculate image dimensions to fit page width while maintaining aspect ratio
      const imgWidth = pageWidth - 40; // 20mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image, checking if it needs a new page
      if (yOffset + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yOffset = 20;
      }
      pdf.addImage(imgData, 'PNG', 20, yOffset, imgWidth, imgHeight);
      yOffset += imgHeight + 20;

      // Add monthly statistics table
      if (yOffset + 60 > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
        yOffset = 20;
      }

      pdf.setFontSize(16);
      pdf.text('Monthly Statistics', 20, yOffset);
      yOffset += 10;

      pdf.setFontSize(10);
      const headers = ['Month', 'Attendance', 'Students', 'Sessions', 'Classes'];
      const columnWidth = 35;
      
      // Draw table headers
      headers.forEach((header, i) => {
        pdf.text(header, 20 + (i * columnWidth), yOffset);
      });
      yOffset += 5;
      pdf.line(20, yOffset, 20 + (headers.length * columnWidth), yOffset);
      yOffset += 5;

      // Draw table rows
      attendanceData.forEach(data => {
        const row = [
          data.month,
          `${data.attendance}%`,
          data.totalStudents.toString(),
          data.sessions.toString(),
          data.activeClasses.toString(),
        ];
        
        row.forEach((cell, i) => {
          pdf.text(cell, 20 + (i * columnWidth), yOffset);
        });
        yOffset += 5;
      });

      // Save the PDF
      pdf.save(`attendance_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({
        title: "Report Exported Successfully",
        description: "Your attendance report has been downloaded as a PDF.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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

          const { count: totalStudents } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')
            .gte('created_at', start)
            .lte('created_at', end);

          const activeClasses = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('active', true)
            .gte('created_at', start)
            .lte('created_at', end);

          return {
            month,
            attendance: totalSessions > 0 ? Math.round((totalAttendance / totalSessions) * 100) : 0,
            totalStudents: totalStudents || 0,
            sessions: totalSessions,
            activeClasses: activeClasses?.count || 0
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
      
      // Get session distribution
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('time_of_day, status')
        .gte('date', startOfMonth(new Date()).toISOString());

      const sessionDistribution = {
        morningSessions: 0,
        afternoonSessions: 0,
        eveningSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0
      };

      sessions?.forEach(session => {
        if (session.time_of_day === 'morning') sessionDistribution.morningSessions++;
        else if (session.time_of_day === 'afternoon') sessionDistribution.afternoonSessions++;
        else if (session.time_of_day === 'evening') sessionDistribution.eveningSessions++;

        if (session.status === 'completed') sessionDistribution.completedSessions++;
        else if (session.status === 'upcoming') sessionDistribution.upcomingSessions++;
      });

      setStats({
        totalStudents: currentStudents || 0,
        averageAttendance: monthlyAttendance[monthlyAttendance.length - 1]?.attendance || 0,
        activeClasses: activeClasses || 0,
        totalSessions: totalSessions || 0,
        studentGrowth: lastMonthStudents ? ((currentStudents - lastMonthStudents) / lastMonthStudents) * 100 : 0,
        attendanceGrowth: 0, // Calculate based on previous month
        classGrowth: 0, // Calculate based on previous month
        sessionGrowth: 0, // Calculate based on previous month
        morningSessions: sessionDistribution.morningSessions,
        afternoonSessions: sessionDistribution.afternoonSessions,
        eveningSessions: sessionDistribution.eveningSessions,
        completedSessions: sessionDistribution.completedSessions,
        upcomingSessions: sessionDistribution.upcomingSessions
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
          <Button variant="primary" onClick={exportReport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={chartsRef}>
        {/* Total Students & Growth */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Student Enrollment Trend</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalStudents" name="Total Students" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">System Overview</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Total Students', value: stats.totalStudents || 0 },
                    { name: 'Average Attendance', value: Math.round((stats.averageAttendance || 0) * stats.totalSessions / 100) },
                    { name: 'Active Classes', value: stats.activeClasses || 0 },
                    { name: 'Total Sessions', value: stats.totalSessions || 0 }
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={2}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ value, percent }) => `${value} (${(percent * 100).toFixed(1)}%)`}
                >
                  {[
                    '#3b82f6', // Total Students (Blue)
                    '#22c55e', // Average Attendance (Green)
                    '#6366f1', // Active Classes (Indigo)
                    '#f97316', // Total Sessions (Orange)
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => {
                  const total = stats.totalStudents + Math.round((stats.averageAttendance || 0) * stats.totalSessions / 100) + stats.activeClasses + stats.totalSessions;
                  return [`${value} (${((value as number / total) * 100).toFixed(1)}%)`, name];
                }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Attendance Trend */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Average Attendance Trend</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendance" name="Average Attendance %" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Classes Overview */}
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Active Classes Overview</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="students"
                  nameKey="name"
                >
                  {classData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
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
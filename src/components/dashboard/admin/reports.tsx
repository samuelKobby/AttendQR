import { useState } from 'react';
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

const attendanceData = [
  { month: 'Jan', attendance: 85 },
  { month: 'Feb', attendance: 88 },
  { month: 'Mar', attendance: 82 },
  { month: 'Apr', attendance: 89 },
  { month: 'May', attendance: 90 },
  { month: 'Jun', attendance: 85 },
];

const classData = [
  { name: 'Computer Science', students: 120, attendance: 85 },
  { name: 'Mathematics', students: 90, attendance: 78 },
  { name: 'Physics', students: 75, attendance: 92 },
  { name: 'Chemistry', students: 85, attendance: 88 },
  { name: 'Biology', students: 95, attendance: 83 },
];

const pieData = [
  { name: 'Present', value: 85, color: '#22c55e' },
  { name: 'Late', value: 10, color: '#eab308' },
  { name: 'Absent', value: 5, color: '#ef4444' },
];

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedClass, setSelectedClass] = useState('All Classes');

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
            value: '1,234',
            change: '+12%',
            icon: Users,
            color: 'bg-blue-500',
          },
          {
            title: 'Average Attendance',
            value: '85%',
            change: '+5%',
            icon: BarChart3,
            color: 'bg-green-500',
          },
          {
            title: 'Active Classes',
            value: '45',
            change: '+3%',
            icon: BookOpen,
            color: 'bg-purple-500',
          },
          {
            title: 'Total Sessions',
            value: '289',
            change: '+8%',
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
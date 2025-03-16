import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  BarChart3,
} from 'lucide-react';
import { QRGenerator } from '@/components/attendance/qr-generator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';

interface Class {
  id: string;
  name: string;
  course_code: string;
  total_students: number;
  attendance_rate: number;
  capacity: number;
}

interface Session {
  id: string;
  class_name: string;
  start_time: string;
  present_count: number;
  total_students: number;
  location: string;
}

export function LecturerDashboard() {
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchClasses();
    fetchRecentSessions();
  }, [authState.user?.id]);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          course_code,
          class_enrollments (count),
          class_sessions (
            attendance_records (count)
          ),
          capacity
        `)
        .eq('lecturer_id', authState.user?.id);

      if (data) {
        setClasses(
          data.map((cls) => ({
            id: cls.id,
            name: cls.name,
            course_code: cls.course_code,
            total_students: cls.class_enrollments[0]?.count || 0,
            attendance_rate:
              (cls.class_sessions.reduce(
                (acc, session) => acc + (session.attendance_records[0]?.count || 0),
                0
              ) /
                (cls.class_sessions.length * cls.class_enrollments[0]?.count || 1)) *
              100,
            capacity: cls.capacity,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const { data } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          classes (
            name,
            location,
            class_enrollments (count)
          ),
          attendance_records (count)
        `)
        .eq('lecturer_id', authState.user?.id)
        .order('start_time', { ascending: false })
        .limit(5);

      if (data) {
        setRecentSessions(
          data.map((session) => ({
            id: session.id,
            class_name: session.classes.name,
            start_time: session.start_time,
            present_count: session.attendance_records[0]?.count || 0,
            total_students: session.classes.class_enrollments[0]?.count || 0,
            location: session.classes.location || 'Not specified',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-10 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Lecturer Dashboard</h1>
          <p className="text-sm text-gray-500">Manage your classes and attendance</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Total Classes</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-semibold">{classes.length}</p>
                <p className="ml-2 text-sm text-green-500">
                  {(classes.length * 1).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 h-1 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-1 rounded-full" 
                  style={{ width: `${Math.min(classes.length * 1, 100)}%` }} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Math.min(classes.length * 1, 100).toFixed(0)}% completed
              </p>
            </div>
            <div className="ml-4">
              <div className="relative">
                <svg className="w-16 h-16" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-blue-100" strokeWidth="2"/>
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    className="stroke-current text-blue-500" 
                    strokeWidth="2"
                    strokeDasharray="100" 
                    strokeDashoffset={100 - Math.min(classes.length * 1, 100)} 
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Active Students</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-semibold">
                  {classes.reduce((acc, cls) => acc + cls.total_students, 0)}
                </p>
                <p className="ml-2 text-sm text-green-500">
                  {((classes.reduce((acc, cls) => acc + cls.total_students, 0) / (classes.reduce((acc, cls) => acc + cls.capacity, 0) || 1)) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 h-1 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-1 rounded-full" 
                  style={{ 
                    width: `${Math.min((classes.reduce((acc, cls) => acc + cls.total_students, 0) / (classes.reduce((acc, cls) => acc + cls.capacity, 0) || 1)) * 100, 100)}%` 
                  }} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Math.min((classes.reduce((acc, cls) => acc + cls.total_students, 0) / (classes.reduce((acc, cls) => acc + cls.capacity, 0) || 1)) * 100, 100).toFixed(0)}% of capacity
              </p>
            </div>
            <div className="ml-4">
              <div className="relative">
                <svg className="w-16 h-16" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-green-100" strokeWidth="2"/>
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    className="stroke-current text-green-500" 
                    strokeWidth="2"
                    strokeDasharray="100" 
                    strokeDashoffset={100 - Math.min((classes.reduce((acc, cls) => acc + cls.total_students, 0) / (classes.reduce((acc, cls) => acc + cls.capacity, 0) || 1)) * 100, 100)}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Today's Sessions</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-semibold">{recentSessions.length}</p>
                <p className="ml-2 text-sm text-green-500">
                  {(recentSessions.length * 1).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 h-1 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-1 rounded-full" 
                  style={{ 
                    width: `${Math.min(recentSessions.length * 1, 100)}%` 
                  }} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Math.min(recentSessions.length * 1, 100).toFixed(0)}% completed
              </p>
            </div>
            <div className="ml-4">
              <div className="relative">
                <svg className="w-16 h-16" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-purple-100" strokeWidth="2"/>
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    className="stroke-current text-purple-500" 
                    strokeWidth="2"
                    strokeDasharray="100" 
                    strokeDashoffset={100 - Math.min(recentSessions.length * 1, 100)}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Avg. Attendance</p>
              <div className="flex items-baseline mt-1">
                <p className="text-2xl font-semibold">
                  {classes.length > 0
                    ? Math.round(
                        classes
                          .filter((cls) => cls.total_students > 0)
                          .reduce((acc, cls) => acc + cls.attendance_rate, 0) /
                        classes.filter((cls) => cls.total_students > 0).length || 0
                      )
                    : 0}%
                </p>
                <p className="ml-2 text-sm text-green-500">
                  {((classes.length > 0
                    ? Math.round(
                        classes
                          .filter((cls) => cls.total_students > 0)
                          .reduce((acc, cls) => acc + cls.attendance_rate, 0) /
                        classes.filter((cls) => cls.total_students > 0).length || 0
                      )
                    : 0) / 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 h-1 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-yellow-500 h-1 rounded-full" 
                  style={{ 
                    width: `${classes.length > 0
                      ? Math.round(
                          classes
                            .filter((cls) => cls.total_students > 0)
                            .reduce((acc, cls) => acc + cls.attendance_rate, 0) /
                          classes.filter((cls) => cls.total_students > 0).length || 0
                        )
                      : 0}%` 
                  }} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {(classes.length > 0
                  ? Math.round(
                      classes
                        .filter((cls) => cls.total_students > 0)
                        .reduce((acc, cls) => acc + cls.attendance_rate, 0) /
                      classes.filter((cls) => cls.total_students > 0).length || 0
                    )
                  : 0)}% of target
              </p>
            </div>
            <div className="ml-4">
              <div className="relative">
                <svg className="w-16 h-16" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-yellow-100" strokeWidth="2"/>
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    className="stroke-current text-yellow-500" 
                    strokeWidth="2"
                    strokeDasharray="100" 
                    strokeDashoffset={100 - (classes.length > 0
                      ? Math.round(
                          classes
                            .filter((cls) => cls.total_students > 0)
                            .reduce((acc, cls) => acc + cls.attendance_rate, 0) /
                          classes.filter((cls) => cls.total_students > 0).length || 0
                        )
                      : 0)} 
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y">
          {recentSessions.map((session) => (
            <div key={session.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-full">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{session.class_name} - Attendance Marked</p>
                    <p className="text-sm text-gray-500">
                      {session.present_count} students present
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(session.start_time), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Classes */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold">Classes</h2>
        </div>
        <div className="divide-y">
          {classes.map((cls) => (
            <div key={cls.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-full">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-gray-500">{cls.course_code}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setActiveClassId(cls.id)}
                  disabled={activeClassId === cls.id}
                >
                  {activeClassId === cls.id ? 'Session Active' : 'Start Session'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Session */}
      {activeClassId && (
        <div className="bg-white rounded-lg shadow-lg transition-shadow duration-200">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-lg font-semibold">Active Session QR Code</h2>
          </div>
          <div className="p-4 sm:p-6">
            <QRGenerator classId={activeClassId} sessionDuration={10} />
          </div>
        </div>
      )}
    </div>
  );
}
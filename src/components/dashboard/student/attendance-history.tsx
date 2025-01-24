import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  class_name: string;
  status: 'present' | 'late' | 'absent';
  marked_at?: string;
}

export function AttendanceHistory() {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Attendance History</h1>
          <p className="text-sm text-gray-500">View your attendance records</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
            Filter by Date
          </Button>
          <Button variant="outline" size="sm" className="px-2 sm:px-3">
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="space-y-4">
          {attendanceHistory.map((record) => (
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
    </div>
  );
}

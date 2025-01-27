import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Calendar,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';

interface AttendanceRecord {
  id: string;
  date: string;
  class_name: string;
  course_code: string;
  status: 'present' | 'late' | 'absent';
  marked_at?: string;
}

export function AttendanceHistory() {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchAttendanceHistory();
  }, [authState.user?.id]);

  const fetchAttendanceHistory = async () => {
    if (!authState.user?.id) return;
    
    try {
      console.log('Fetching attendance history for user:', authState.user.id);
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          marked_at,
          status,
          session_id,
          class_sessions!inner (
            start_time,
            end_time,
            class_id,
            classes!inner (
              name,
              course_code
            )
          )
        `)
        .eq('student_id', authState.user.id)
        .order('marked_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('Raw attendance data:', data);

      const history = data
        ?.filter(record => 
          record.class_sessions && 
          record.class_sessions.classes
        )
        .map((record) => ({
          id: record.id,
          date: record.class_sessions.start_time,
          class_name: record.class_sessions.classes.name,
          course_code: record.class_sessions.classes.course_code,
          marked_at: record.marked_at,
          status: record.status || 'present'
        })) || [];

      console.log('Processed attendance history:', history);
      setAttendanceHistory(history);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const filteredHistory = attendanceHistory.filter((record) => {
    if (!dateFilter.startDate && !dateFilter.endDate) return true;

    const recordDate = new Date(record.date);
    const startDate = dateFilter.startDate
      ? new Date(dateFilter.startDate)
      : null;
    const endDate = dateFilter.endDate
      ? new Date(dateFilter.endDate)
      : null;

    if (startDate && endDate) {
      return recordDate >= startDate && recordDate <= endDate;
    } else if (startDate) {
      return recordDate >= startDate;
    } else if (endDate) {
      return recordDate <= endDate;
    }

    return true;
  });

  const downloadHistory = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Class', 'Course Code', 'Time', 'Status'];
      const rows = filteredHistory.map((record) => [
        format(new Date(record.date), 'MM/dd/yyyy'),
        record.class_name,
        record.course_code,
        format(new Date(record.marked_at), 'hh:mm a'),
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `attendance_history_${format(new Date(), 'dd-MM-yyyy')}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading history:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between  gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Attendance History</h1>
          <p className="text-sm text-gray-500">View your attendance records</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
            onClick={() => setShowDateFilter(true)}
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
            Filter by Date
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            onClick={downloadHistory}
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="space-y-4">
          {filteredHistory.map((record) => (
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
      {showDateFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Filter by Date</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDateFilter(false)}>
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
                  value={dateFilter.startDate}
                  onChange={(e) =>
                    setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
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
                  value={dateFilter.endDate}
                  onChange={(e) =>
                    setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setDateFilter({
                      startDate: '',
                      endDate: '',
                    })
                  }
                >
                  Reset
                </Button>
                <Button onClick={() => setShowDateFilter(false)}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, QrCode, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO, isToday } from 'date-fns';
import { QRScanner } from '@/components/attendance/qr-scanner';
import { AttendanceForm } from '@/components/attendance/attendance-form';

interface ClassSession {
  id: string;
  start_time: string;
  end_time: string;
  class: {
    name: string;
    course_code: string;
  };
  attendance_records: {
    id: string;
    student_id: string;
  }[];
}

export function StudentAttendance() {
  const [todaySessions, setTodaySessions] = useState<ClassSession[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [scannedData, setScannedData] = useState<{
    sessionId: string;
    token: string;
    lat?: string;
    lng?: string;
  } | null>(null);
  const { authState } = useAuth();

  useEffect(() => {
    fetchTodaySessions();
  }, [authState.user?.id]);

  const fetchTodaySessions = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: sessions, error } = await supabase
        .from('class_sessions')
        .select(`
          id,
          start_time,
          end_time,
          class:classes (
            name,
            course_code
          ),
          attendance_records (
            id,
            student_id
          )
        `)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time');

      if (error) throw error;

      setTodaySessions(sessions || []);
    } catch (error) {
      console.error('Error fetching today\'s sessions:', error);
    }
  };

  const handleScan = (data: { 
    sessionId: string; 
    token: string;
    lat?: string;
    lng?: string;
  }) => {
    console.log('QR scan data received:', data);
    setScannedData(data);
    setShowScanner(false);
    setShowAttendanceForm(true);
  };

  const handleMark = (sessionId: string) => {
    // Show QR scanner for the specific session
    setShowScanner(true);
  };

  const hasMarkedAttendance = (session: ClassSession) => {
    return session.attendance_records.some(record => record.student_id === authState.user?.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Mark Attendance</h1>
          <p className="text-sm text-gray-500">Scan QR code to mark your attendance</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-sm text-center">
              <Button
                onClick={() => setShowScanner(true)}
                className="w-full py-6 sm:py-8 text-base sm:text-lg"
                size="lg"
              >
                <QrCode className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4" />
                Scan QR Code
              </Button>
              <p className="mt-4 text-sm text-gray-500">
                Point your camera at the QR code displayed by your lecturer
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {todaySessions.length > 0 ? (
              todaySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm sm:text-base">
                        {session.class.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {format(parseISO(session.start_time), 'hh:mm a')} - {format(parseISO(session.end_time), 'hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => handleMark(session.id)}
                    disabled={hasMarkedAttendance(session)}
                  >
                    {hasMarkedAttendance(session) ? 'Marked' : 'Mark'}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No classes scheduled for today</p>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Scan QR Code</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}

      {showAttendanceForm && scannedData && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <AttendanceForm
              sessionId={scannedData.sessionId}
              token={scannedData.token}
              lat={scannedData.lat}
              lng={scannedData.lng}
              onClose={() => {
                setShowAttendanceForm(false);
                setScannedData(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

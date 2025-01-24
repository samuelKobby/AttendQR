import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface QRGeneratorProps {
  classId: string;
  sessionDuration?: number; // in minutes
}

export function QRGenerator({ classId, sessionDuration = 15 }: QRGeneratorProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [attendees, setAttendees] = useState<Array<{
    student_name: string;
    marked_at: string;
  }>>([]);
  const { authState } = useAuth();

  const generateSession = async () => {
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + sessionDuration * 60000);
      const token = crypto.randomUUID();

      const { data, error } = await supabase
        .from('class_sessions')
        .insert({
          class_id: classId,
          lecturer_id: authState.user?.id,
          qr_token: token,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setQrToken(token);
      setTimeLeft(sessionDuration * 60);
    } catch (error) {
      console.error('Error generating session:', error);
    }
  };

  const fetchAttendees = async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        student_id,
        marked_at,
        auth.users!inner (
          email,
          raw_user_meta_data->>'full_name' as student_name
        )
      `)
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: false });

    if (!error && data) {
      setAttendees(
        data.map((record) => ({
          student_name: record.users.student_name || record.users.email,
          marked_at: record.marked_at,
        }))
      );
    }
  };

  useEffect(() => {
    let timer: number;
    if (timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Fetch attendees every 10 seconds
      const attendeesTimer = setInterval(fetchAttendees, 10000);
      return () => {
        clearInterval(timer);
        clearInterval(attendeesTimer);
      };
    }
    return () => clearInterval(timer);
  }, [timeLeft, sessionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttendanceUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/student/attendance?session=${sessionId}&token=${qrToken}`;
  };

  return (
    <div className="space-y-6">
      {!sessionId ? (
        <Button onClick={generateSession} size="lg" className="w-full">
          Start Attendance Session
        </Button>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2 text-lg font-medium">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>Time remaining: {formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <span>{attendees.length} present</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {qrToken && (
              <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-center">
                  Scan to Mark Attendance
                </h3>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <QRCode
                      value={getAttendanceUrl()}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>
                <p className="text-center text-sm text-gray-600">
                  Valid for {formatTime(timeLeft)}
                </p>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Present Students</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {attendees.length > 0 ? (
                  attendees.map((attendee, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">
                          {attendee.student_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(attendee.marked_at), 'HH:mm:ss')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">
                    No students present yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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

      console.log('Generating session with:', {
        class_id: classId,
        lecturer_id: authState.user?.id,
        token,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });

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
        .select('id, qr_token, active, start_time, end_time')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      console.log('Session created successfully:', {
        data,
        token,
        qrToken: data.qr_token
      });

      setSessionId(data.id);
      setQrToken(token);
      setTimeLeft(sessionDuration * 60);

      // Fetch attendees immediately after session creation
      await fetchAttendees();

      // Verify the session was created
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('get_session_by_id', {
          session_id: data.id
        });

      console.log('Session verification:', {
        data: verifyData,
        error: verifyError,
        query: {
          id: data.id,
          token: token,
          storedToken: Array.isArray(verifyData) ? verifyData[0]?.qr_token : verifyData?.qr_token
        }
      });

    } catch (error) {
      console.error('Error generating session:', error);
    }
  };

  const fetchAttendees = async () => {
    if (!sessionId) {
      console.log('No sessionId available, skipping fetch');
      return;
    }

    try {
      console.log('Fetching attendees for session:', sessionId);

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          student_id,
          marked_at,
          students:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq('session_id', sessionId);

      console.log('Raw attendance data:', data);
      
      if (error) {
        console.error('Error fetching attendees:', error);
        return;
      }

      if (!data) {
        console.log('No data returned from query');
        return;
      }

      const formattedAttendees = data.map((record) => ({
        student_name: record.students?.full_name || record.students?.email || 'Unknown Student',
        marked_at: record.marked_at,
      }));

      console.log('Formatted attendees:', formattedAttendees);
      setAttendees(formattedAttendees);
      
    } catch (err) {
      console.error('Exception in fetchAttendees:', err);
    }
  };

  // Separate useEffect for timer countdown
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
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Separate useEffect for fetching attendees
  useEffect(() => {
    let attendeesTimer: number;
    
    if (sessionId) {
      console.log('Setting up attendees polling for session:', sessionId);
      // Fetch immediately
      fetchAttendees();
      // Then fetch every 5 seconds
      attendeesTimer = window.setInterval(fetchAttendees, 5000);
    }

    return () => {
      if (attendeesTimer) {
        console.log('Cleaning up attendees timer');
        clearInterval(attendeesTimer);
      }
    };
  }, [sessionId]); // Only re-run when sessionId changes

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
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <QRCode
                      value={getAttendanceUrl()}
                      size={300}
                      level="H"
                      includeMargin
                      className="w-full h-full"
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
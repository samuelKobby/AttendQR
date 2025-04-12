import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { Clock, Users, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useToast } from '@/components/ui/use-toast';

interface QRGeneratorProps {
  classId: string;
}

export function QRGenerator({ classId }: QRGeneratorProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [attendees, setAttendees] = useState<Array<{
    student_name: string;
    marked_at: string;
  }>>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { authState } = useAuth();
  const { settings, loading: settingsLoading } = useSystemSettings();
  const { toast } = useToast();

  const generateSession = async () => {
    try {
      if (!settings) {
        throw new Error('System settings not loaded');
      }

      // Get current location
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      console.log('Requesting teacher location...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const teacherLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      console.log('Teacher location obtained:', teacherLocation);
      setLocation(teacherLocation);

      const startTime = new Date();
      const sessionDuration = settings.qr_session_duration;
      const endTime = new Date(startTime.getTime() + sessionDuration * 60000);
      const token = crypto.randomUUID();

      // Create the session
      const { data, error } = await supabase
        .from('class_sessions')
        .insert({
          class_id: classId,
          lecturer_id: authState?.user?.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          qr_token: token,
          latitude: teacherLocation.lat.toString(),
          longitude: teacherLocation.lng.toString(),
          active: true,
          duration_minutes: sessionDuration
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      console.log('Session created:', data);
      setSessionId(data.id);
      setQrToken(token);
      setTimeLeft(sessionDuration * 60);

      // Generate QR code URL with all necessary parameters
      const qrData = new URL(window.location.origin + '/student/attendance');
      qrData.searchParams.set('session', data.id);
      qrData.searchParams.set('token', token);
      qrData.searchParams.set('lat', teacherLocation.lat.toString());
      qrData.searchParams.set('lng', teacherLocation.lng.toString());
      
      console.log('QR code data:', qrData.toString());

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

  const exportSessionAttendance = async () => {
    if (!sessionId) {
      console.error('No active session');
      toast({
        title: "Export Failed",
        description: "No active session to export",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting export for session:', sessionId);
    try {
      // First get all students enrolled in the class
      console.log('Fetching enrolled students for class:', classId);
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId);

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError);
        throw enrollmentError;
      }

      // Then get their profile information
      const studentIds = enrollments?.map(e => e.student_id) || [];
      console.log('Found enrolled students:', studentIds.length);

      const { data: studentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }

      // Get attendance records for this session
      console.log('Fetching attendance records for session:', sessionId);
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId);

      if (attendanceError) {
        console.error('Attendance error:', attendanceError);
        throw attendanceError;
      }

      console.log('Found attendance records:', attendanceRecords?.length);

      // Get session details
      console.log('Fetching session details');
      const { data: sessionData, error: sessionError } = await supabase
        .from('class_sessions')
        .select('*, classes(name, course_code)')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      console.log('Session data:', sessionData);

      if (!studentProfiles || !sessionData || !sessionData.classes) {
        throw new Error('Missing required data for export');
      }

      // Create CSV data
      const headers = [
        'Date',
        'Time',
        'Class',
        'Course Code',
        'Student Name',
        'Status',
        'Marked Time'
      ];

      const sessionDate = new Date(sessionData.start_time);
      const rows = studentProfiles.map(student => {
        const attendance = attendanceRecords?.find(
          record => record.student_id === student.id
        );
        
        const status = attendance
          ? (() => {
              const markedTime = new Date(attendance.marked_at);
              const timeDiff = markedTime.getTime() - sessionDate.getTime();
              return timeDiff <= 15 * 60 * 1000 ? 'Present' : 'Late';
            })()
          : 'Absent';

        return [
          format(sessionDate, 'MM/dd/yyyy'),
          format(sessionDate, 'hh:mm a'),
          sessionData.classes.name,
          sessionData.classes.course_code,
          student.full_name,
          status,
          attendance ? format(new Date(attendance.marked_at), 'hh:mm:ss a') : '-'
        ];
      });

      console.log('Generated rows:', rows.length);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      console.log('CSV content generated, creating download...');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const fileName = `attendance_${sessionData.classes.course_code}_${format(sessionDate, 'MM-dd-yyyy_HH-mm')}.csv`;
      console.log('Downloading file:', fileName);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Attendance Report Downloaded",
        description: "The attendance report has been exported successfully.",
        variant: "success"
      });
    } catch (error) {
      console.error('Error exporting attendance:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "There was an error exporting the attendance report.",
        variant: "destructive"
      });
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
    console.log('Creating attendance URL with:', {
      sessionId,
      token: qrToken,
      location
    });
    
    if (!sessionId || !qrToken) {
      console.error('Missing session or token');
      throw new Error('Session data not available');
    }

    if (!location?.lat || !location?.lng) {
      console.error('No valid location available for QR code');
      throw new Error('Location not available. Please try again.');
    }

    const urlParams = {
      session: sessionId,
      token: qrToken,
      lat: location.lat.toFixed(6),
      lng: location.lng.toFixed(6)
    };

    console.log('URL parameters:', urlParams);

    const searchParams = new URLSearchParams();
    Object.entries(urlParams).forEach(([key, value]) => {
      searchParams.append(key, value);
    });

    const finalUrl = `${baseUrl}/student/attendance?${searchParams.toString()}`;
    console.log('Final URL:', finalUrl);
    return finalUrl;
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
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <span>{attendees.length} present</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 text-green-600 border-green-200 hover:bg-green-50"
                onClick={exportSessionAttendance}
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {qrToken && location ? (
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
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                <h3 className="text-lg font-semibold text-center text-yellow-600">
                  Waiting for Location...
                </h3>
                <div className="flex justify-center">
                  <div className="bg-yellow-50 p-6 rounded-lg">
                    <p className="text-center text-sm text-yellow-700">
                      Please allow location access to generate the attendance QR code
                    </p>
                  </div>
                </div>
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
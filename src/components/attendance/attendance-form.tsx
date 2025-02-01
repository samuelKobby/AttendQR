import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Loader2, UserCheck, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignaturePadComponent } from './signature-pad';

const attendanceSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  studentName: z.string().min(1, 'Student name is required'),
  signature: z.string().min(1, 'Signature is required'),
  schoolStudentId: z.string().min(1, 'School Student ID is required')
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface AttendanceFormProps {
  sessionId: string;
  token: string;
  onClose: () => void;
}

export function AttendanceForm({ sessionId, token, onClose }: AttendanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teacherLat = parseFloat(searchParams.get('lat') || '0');
  const teacherLng = parseFloat(searchParams.get('lng') || '0');

  // Function to calculate distance between two points in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Function to verify student's location
  const verifyLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser');
    }

    if (!teacherLat || !teacherLng) {
      throw new Error('Teacher location not found in QR code');
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const studentLat = position.coords.latitude;
      const studentLng = position.coords.longitude;

      const distance = calculateDistance(
        teacherLat,
        teacherLng,
        studentLat,
        studentLng
      );

      const MAX_DISTANCE = 50; // Maximum allowed distance in meters

      if (distance > MAX_DISTANCE) {
        throw new Error(`You are too far from the class location (${Math.round(distance)}m away). Must be within ${MAX_DISTANCE}m.`);
      }

      return true;
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            throw new Error('Please enable location access to mark attendance');
          case err.POSITION_UNAVAILABLE:
            throw new Error('Location information is unavailable');
          case err.TIMEOUT:
            throw new Error('Location request timed out');
        }
      }
      throw err;
    }
  };

  // Log initialization props and auth state
  console.log('AttendanceForm initialized with:', {
    sessionId,
    token,
    authState: {
      isAuthenticated: authState.isAuthenticated,
      userId: authState.user?.id,
      studentId: authState.user?.student_id,
      name: authState.user?.name
    }
  });

  useEffect(() => {
    // Verify session on component mount
    const verifySession = async () => {
      if (!sessionId) {
        console.error('No session ID provided');
        setError('Invalid session');
        return;
      }

      try {
        console.log('Verifying session:', { sessionId, token });
        
        // First check if the session exists using rpc
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('get_session_by_id', {
            session_id: sessionId
          });

        console.log('Session verification result:', { 
          data: sessionData, 
          error: sessionError,
          query: {
            id: sessionId,
            token: token
          }
        });

        if (sessionError) {
          console.error('Session verification failed:', sessionError);
          setError('Invalid session');
          return;
        }

        // Since the function returns an array with one item
        const sessionCheck = Array.isArray(sessionData) ? sessionData[0] : sessionData;

        if (!sessionCheck) {
          console.error('No session found');
          setError('Session not found');
          return;
        }

        // Verify token matches
        if (sessionCheck.qr_token !== token) {
          console.error('Token mismatch:', {
            provided: token,
            expected: sessionCheck.qr_token
          });
          setError('Invalid QR code');
          return;
        }

        // Check if session is active
        if (!sessionCheck.active) {
          console.error('Session is not active');
          setError('Session is not active');
          return;
        }

        // Check session time
        const now = new Date();
        const startTime = new Date(sessionCheck.start_time);
        const endTime = new Date(sessionCheck.end_time);

        console.log('Time validation:', {
          now: now.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });

        if (now < startTime) {
          setError('Session has not started yet');
          return;
        }

        if (now > endTime) {
          setError('Session has expired');
          return;
        }

      } catch (err) {
        console.error('Error in session verification:', err);
        setError('Error verifying session');
      }
    };

    verifySession();
  }, [sessionId, token]);

  // Log auth state for debugging
  console.log('Auth State:', authState);
  console.log('User:', authState.user);
  console.log('Student ID:', authState.user?.student_id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      studentId: authState.user?.id || '',
      studentName: authState.user?.name || '',
      signature: '',
      schoolStudentId: authState.user?.student_id || ''
    },
  });

  // Watch the schoolStudentId field for changes
  const schoolStudentId = watch('schoolStudentId');
  console.log('Current schoolStudentId:', schoolStudentId);

  // Effect to update form values when auth state changes
  useEffect(() => {
    if (authState.user) {
      console.log('Setting form values with:', {
        id: authState.user.id,
        name: authState.user.name,
        student_id: authState.user.student_id
      });
      setValue('studentId', authState.user.id || '');
      setValue('studentName', authState.user.name || '');
      setValue('schoolStudentId', authState.user.student_id || '');
    }
  }, [authState.user, setValue]);

  // Add a useEffect to check if form values are set correctly
  useEffect(() => {
    const values = {
      studentId: watch('studentId'),
      studentName: watch('studentName'),
      schoolStudentId: watch('schoolStudentId')
    };
    console.log('Current form values:', values);
  }, [watch]);

  const onSubmit = async (data: AttendanceFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Auth state during submission:', authState.user);
    console.log('Session and token:', { sessionId, token });
    
    if (!sessionId || !token) {
      console.log('Missing sessionId or token:', { sessionId, token });
      setError('Invalid session or token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify location first
      await verifyLocation();

      // First check if the session exists
      console.log('Checking session existence:', { sessionId });
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('get_session_by_id', {
          session_id: sessionId
        });

      if (sessionError) {
        console.error('Session check error:', sessionError);
        throw new Error('Session not found');
      }

      // Get the first row since rpc returns an array
      const sessionCheck = Array.isArray(sessionData) ? sessionData[0] : sessionData;

      if (!sessionCheck) {
        console.error('No session found with ID:', sessionId);
        throw new Error('Session not found');
      }

      console.log('Found session:', sessionCheck);

      // Then check if the token matches
      if (sessionCheck.qr_token !== token) {
        console.error('Token mismatch:', {
          provided: token,
          expected: sessionCheck.qr_token
        });
        throw new Error('Invalid QR code token');
      }

      // Check if the session is active
      if (!sessionCheck.active) {
        console.error('Session is not active');
        throw new Error('Session is not active');
      }

      // Get the class name
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('name')
        .eq('id', sessionCheck.class_id)
        .single();

      if (classError) {
        console.error('Error getting class details:', classError);
        throw new Error('Error getting class details');
      }

      const session = {
        ...sessionCheck,
        classes: classData
      };

      console.log('Full session details:', session);

      const now = new Date();
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);

      console.log('Time validation:', { 
        now: now.toISOString(), 
        startTime: startTime.toISOString(), 
        endTime: endTime.toISOString() 
      });

      if (now < startTime) {
        throw new Error('Session has not started yet');
      }

      if (now > endTime) {
        throw new Error('Session has expired');
      }

      // Verify student ID matches the authenticated user
      console.log('Student ID verification:', {
        formStudentId: data.schoolStudentId,
        userStudentId: authState.user?.student_id,
        rawAuthState: authState
      });

      if (!authState.user?.student_id) {
        throw new Error('Student ID not found in your profile');
      }

      if (data.schoolStudentId !== authState.user.student_id) {
        throw new Error('Student ID does not match your account');
      }

      // Check for existing attendance
      const { data: existingAttendance, error: attendanceCheckError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', authState.user?.id)
        .single();

      console.log('Existing attendance check:', { existingAttendance, error: attendanceCheckError });

      if (existingAttendance) {
        throw new Error('You have already marked attendance for this session');
      }

      // Mark attendance
      console.log('Attempting to insert attendance record with:', {
        session_id: sessionId,
        student_id: authState.user?.id,
        student_name: data.studentName,
        signature: data.signature,
        marked_at: new Date().toISOString(),
        auth_user_id: supabase.auth.getUser()
      });

      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: authState.user?.id,
          school_student_id: data.schoolStudentId,
          student_name: data.studentName,
          signature: data.signature,
          marked_at: new Date().toISOString(),
        });

      console.log('Attendance marking result:', { error: attendanceError });

      if (attendanceError) {
        throw attendanceError;
      }

      // Create notifications for both student and lecturer
      const notifications = [
        {
          // Student notification
          user_id: authState.user?.id,
          title: 'Attendance Marked',
          message: `Your attendance has been recorded for ${session.classes.name}`,
          type: 'success',
          read: false
        },
        {
          // Lecturer notification
          user_id: session.lecturer_id,
          title: 'New Attendance',
          message: `${data.studentName} has marked attendance for ${session.classes.name}`,
          type: 'info',
          read: false
        }
      ];

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        navigate('/student/history', {
          state: {
            success: `Attendance marked successfully for ${session.classes.name}`,
          },
        });
      }, 2000);
    } catch (err) {
      console.error('Attendance marking failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-600">
            Attendance Marked!
          </h2>
          <p className="text-gray-600">
            Your attendance has been recorded successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mark Attendance</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="schoolStudentId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Student ID
          </label>
          <Input
            id="schoolStudentId"
            {...register('schoolStudentId')}
            type="text"
            className="w-full"
            disabled={true}
          />
          {errors.schoolStudentId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.schoolStudentId.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="studentName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Student Name
          </label>
          <Input
            id="studentName"
            {...register('studentName')}
            type="text"
            className="w-full"
            disabled={true}
          />
          {errors.studentName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.studentName.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Signature
          </label>
          <SignaturePadComponent
            onChange={(signature) => setValue('signature', signature)}
          />
          {errors.signature && (
            <p className="mt-1 text-sm text-red-600">
              {errors.signature.message}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Marking Attendance...
            </>
          ) : (
            'Mark Attendance'
          )}
        </Button>
      </form>
    </div>
  );
}
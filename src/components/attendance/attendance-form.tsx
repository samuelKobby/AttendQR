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
    
    if (!sessionId || !token) {
      console.log('Missing sessionId or token:', { sessionId, token });
      setError('Invalid session or token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify session is still valid
      const { data: session, error: sessionError } = await supabase
        .from('class_sessions')
        .select('*, classes(name)')
        .eq('id', sessionId)
        .eq('qr_token', token)
        .eq('active', true)
        .single();

      console.log('Session verification result:', { session, error: sessionError });

      if (sessionError || !session) {
        throw new Error('Invalid or expired session');
      }

      const now = new Date();
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);

      console.log('Time validation:', { now, startTime, endTime });

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
          student_name: data.studentName,
          signature: data.signature,
          marked_at: new Date().toISOString(),
        });

      console.log('Attendance marking result:', { error: attendanceError });

      if (attendanceError) {
        throw attendanceError;
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
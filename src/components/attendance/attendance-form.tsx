import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Loader2, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignaturePadComponent } from './signature-pad';

const attendanceSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  studentName: z.string().min(1, 'Student name is required'),
  signature: z.string().min(1, 'Signature is required'),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export function AttendanceForm() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { authState } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      studentId: authState.user?.id || '',
      studentName: authState.user?.name || '',
      signature: '',
    },
  });

  const onSubmit = async (data: AttendanceFormData) => {
    if (!sessionId || !token) {
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

      if (sessionError || !session) {
        throw new Error('Invalid or expired session');
      }

      const now = new Date();
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);

      if (now < startTime) {
        throw new Error('Session has not started yet');
      }

      if (now > endTime) {
        throw new Error('Session has expired');
      }

      // Verify student ID matches the authenticated user
      if (data.studentId !== authState.user?.id) {
        throw new Error('Student ID does not match your account');
      }

      // Check for existing attendance
      const { data: existingAttendance } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', data.studentId)
        .single();

      if (existingAttendance) {
        throw new Error('You have already marked attendance for this session');
      }

      // Mark attendance
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: data.studentId,
          signature: data.signature,
          marked_at: new Date().toISOString(),
        });

      if (attendanceError) {
        throw attendanceError;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/student/history', {
          state: {
            success: `Attendance marked successfully for ${session.classes.name}`,
          },
        });
      }, 2000);
    } catch (err) {
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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Mark Attendance</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="studentId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Student ID
          </label>
          <Input
            id="studentId"
            {...register('studentId')}
            type="text"
            className="w-full"
            disabled={true}
          />
          {errors.studentId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.studentId.message}
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
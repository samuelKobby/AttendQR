import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, ArrowLeft, User, CreditCard, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { role } = useParams();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!email || !password || !fullName) {
        throw new Error('Please fill in all required fields');
      }

      if (role === 'student' && !studentId) {
        throw new Error('Student ID is required for student registration');
      }

      // Validate student ID format (you can modify this regex as needed)
      if (role === 'student' && !/^[A-Z0-9]+$/i.test(studentId)) {
        throw new Error('Invalid Student ID format');
      }

      // Prepare metadata with strict formatting
      const userRole = role || 'student';
      const metadata = {
        full_name: fullName.trim(),
        role: userRole,
        student_id: role === 'student' ? studentId.trim().toUpperCase() : null
      };

      console.log('Attempting signup with:', {
        email: email.trim(),
        role: userRole,
        metadata
      });

      // Attempt signup - this will trigger the database function to create profile
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('No user data returned from signup');
      }

      console.log('Signup successful:', {
        userId: data.user.id,
        role: userRole
      });

      // Verify profile creation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile verification error:', profileError);
      } else {
        console.log('Profile created successfully:', profile);
      }

      toast({
        title: "Account created!",
        description: "Please check your email for verification link before signing in.",
        duration: 5000
      });

      navigate(`/login/${userRole}`);
    } catch (error) {
      console.error('Signup failed:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create account'
      );
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = {
    student: 'Student',
    lecturer: 'Lecturer',
    admin: 'Admin',
  }[role || 'student'];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="absolute left-4 top-4">
        <Button
          variant="ghost"
          className="mr-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <QrCode className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AttendanceQR
            </span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Sign up as {roleTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="full-name" className="sr-only">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="full-name"
                  name="full-name"
                  type="text"
                  required
                  className="pl-10"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {role === 'student' && (
              <div>
                <label htmlFor="student-id" className="sr-only">
                  Student ID
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="student-id"
                    name="student-id"
                    type="text"
                    required
                    className="pl-10"
                    placeholder="Student ID"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="pl-10"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </div>
        </form>

        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Button
            variant="link"
            className="p-0 font-semibold"
            onClick={() => navigate(`/login/${role}`)}
          >
            Sign in
          </Button>
        </p>
      </div>
    </div>
  );
}
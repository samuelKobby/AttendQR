import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, ArrowLeft, User, CreditCard, QrCode, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    requirements: {
      minLength: false,
      hasNumber: false,
      hasSpecial: false,
      hasUppercase: false,
      hasLowercase: false
    }
  });

  const navigate = useNavigate();
  const { role } = useParams<{ role: 'student' | 'lecturer' | 'admin' }>();
  const { toast } = useToast();

  const checkPasswordStrength = (password: string) => {
    const requirements = {
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength({ score, requirements });
  };

  const getStrengthColor = (score: number) => {
    if (score <= 1) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

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
    admin: 'Admin'
  }[role || 'student'] as string;

  const roleColor = role === 'student'
    ? 'from-blue-500 to-blue-600'
    : role === 'lecturer'
    ? 'from-green-500 to-green-600'
    : 'from-purple-500 to-purple-600';

  const overlayColor = role === 'student'
    ? 'from-blue-500/15 to-blue-600/25'
    : role === 'lecturer'
    ? 'from-green-500/15 to-green-600/25'
    : 'from-purple-500/15 to-purple-600/25';

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:w-1/2 xl:px-12">
        <div className="absolute left-4 top-4">
          <Button
            variant="link"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <QrCode className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AttendanceQR
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Sign Up</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create your {roleTitle.toLowerCase()} account
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
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    className="pl-10 pr-10"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 w-full rounded-full ${
                          i < passwordStrength.score
                            ? getStrengthColor(passwordStrength.score)
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm space-y-1">
                    <p className={`${passwordStrength.requirements.minLength ? "text-green-600" : "text-gray-500"}`}>
                      ✓ At least 8 characters
                    </p>
                    <p className={`${passwordStrength.requirements.hasNumber ? "text-green-600" : "text-gray-500"}`}>
                      ✓ Contains a number
                    </p>
                    <p className={`${passwordStrength.requirements.hasSpecial ? "text-green-600" : "text-gray-500"}`}>
                      ✓ Contains a special character
                    </p>
                    <p className={`${passwordStrength.requirements.hasUppercase ? "text-green-600" : "text-gray-500"}`}>
                      ✓ Contains an uppercase letter
                    </p>
                    <p className={`${passwordStrength.requirements.hasLowercase ? "text-green-600" : "text-gray-500"}`}>
                      ✓ Contains a lowercase letter
                    </p>
                  </div>
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
                className={`w-full bg-gradient-to-r ${roleColor} text-white hover:opacity-90`}
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

      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${overlayColor} z-10`} />
        <img
          src={`https://images.unsplash.com/photo-${
            role === 'student'
              ? '1523240795612-9a054b0db644'
              : role === 'lecturer'
              ? '1524178232363-1fb2b075b655'
              : '1553877522-43269d4ea984'
          }?auto=format&fit=crop&q=90&w=1200`}
          alt={`${roleTitle} Signup`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
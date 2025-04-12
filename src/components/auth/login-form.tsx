import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, ArrowLeft, QrCode, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AuthContextType } from '@/lib/types';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { role } = useParams<{ role: 'student' | 'lecturer' | 'admin' }>();
  const { login } = useAuth() as AuthContextType;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // Store password temporarily for admin/lecturer session restoration
      if (role === 'admin' || role === 'lecturer') {
        localStorage.setItem('temp_admin_pass', password);
      }
      navigate(`/${role}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
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
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Sign In</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your {roleTitle.toLowerCase()} account
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {role === 'student' && (
                <p className="text-sm text-gray-600">
                  First time login? Use your temporary password format: Ug + Your Student ID
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className={`w-full bg-gradient-to-r ${roleColor} text-white hover:opacity-90`}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                {role !== 'student' && (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate(`/signup/${role}`)}
                      className="text-blue-600 hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            </div>
          </form>
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
          alt={`${roleTitle} Login`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
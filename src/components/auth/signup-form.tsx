import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, ArrowLeft, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { role } = useParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role || 'admin',
          },
        },
      });

      if (signUpError) throw signUpError;

      // Navigate to login page after successful signup
      navigate(`/login/${role}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = {
    student: 'Student',
    lecturer: 'Lecturer',
    admin: 'Admin',
  }[role || 'admin'];

  const roleColor = {
    student: 'from-blue-500 to-blue-600',
    lecturer: 'from-green-500 to-green-600',
    admin: 'from-purple-500 to-purple-600',
  }[role || 'admin'];

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="mr-4"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Sign up as {roleTitle}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Create your account to get started
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
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
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
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
                {loading ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate(`/login/${role}`)}
                  className="text-blue-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className={`hidden lg:block lg:w-1/2 bg-gradient-to-br ${roleColor}`}>
        <div className="flex items-center justify-center h-full p-8">
          <img
            src={`https://images.unsplash.com/photo-${
              role === 'student'
                ? '1523240795612-9a054b0db644'
                : role === 'lecturer'
                ? '1524178232363-1fb2b075b655'
                : '1553877522-43269d4ea984'
            }?auto=format&fit=crop&q=80&w=800`}
            alt={`${roleTitle} Sign Up`}
            className="max-w-md w-full rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
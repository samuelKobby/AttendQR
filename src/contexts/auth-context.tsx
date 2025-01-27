import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, AuthContextType, User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Helper function to get redirect path based on user role
  const getRedirectPath = (role: string): string => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'lecturer':
        return '/lecturer/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/';
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });

      // First attempt to sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!authData.user) {
        throw new Error('No user data returned from login');
      }

      // Then fetch the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      if (!profile) {
        console.error('No profile found for user:', authData.user.id);
        throw new Error('User profile not found');
      }

      const user: User = {
        id: authData.user.id,
        email: authData.user.email!,
        name: profile.full_name,
        role: profile.role,
        student_id: profile.student_id
      };

      dispatch({ type: 'LOGIN_SUCCESS', payload: user });

      // Show success toast
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.name}`,
      });

      // Get the intended path from location state or default to role-based path
      const intendedPath = location.state?.from || getRedirectPath(user.role);
      navigate(intendedPath, { replace: true });

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to login';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const loginWithGoogle = async () => {
    try {
      dispatch({ type: 'LOGIN_START' });

      const { error } = await retry(() =>
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        })
      );

      if (error) throw error;
    } catch (error) {
      console.error('Google login error:', error);
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: 'Failed to sign in with Google',
      });
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
      navigate('/');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Skip session check if we're explicitly logged out
        if (state.isAuthenticated === false && !localStorage.getItem('auth_user')) {
          return;
        }

        const { data: { session }, error: sessionError } = await retry(() =>
          supabase.auth.getSession()
        );
        
        if (sessionError) throw sessionError;
        
        if (session) {
          const { data: profileData, error: profileError } = await retry(() =>
            supabase
              .from('profiles')
              .select('role, full_name, student_id')
              .eq('id', session.user.id)
              .single()
          );

          if (profileError) throw profileError;

          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: profileData.full_name || session.user.email!.split('@')[0],
            role: profileData.role as 'admin' | 'lecturer' | 'student',
            student_id: profileData.student_id
          };

          localStorage.setItem('auth_user', JSON.stringify(user));
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });

          // Only redirect if we're on the landing page
          if (location.pathname === '/') {
            const basePath = `/${user.role}`;
            navigate(basePath);
          }
        } else {
          // No session found, clear any stale data
          localStorage.removeItem('auth_user');
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('auth_user');
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Failed to restore session' });
      }
    };

    checkExistingSession();
  }, [navigate, location.pathname, state.isAuthenticated]);

  return (
    <AuthContext.Provider value={{ authState: state, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
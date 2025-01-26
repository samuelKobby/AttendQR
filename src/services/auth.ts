import { supabase } from '../lib/supabase';
import { databaseService } from './database';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'lecturer' | 'student';
}

export const authService = {
  async signUp({ email, password, full_name, role }: SignUpData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return null;

    try {
      const profile = await databaseService.getCurrentProfile();
      return { ...user, profile };
    } catch (e) {
      console.error('Error fetching profile:', e);
      return user;
    }
  }
};

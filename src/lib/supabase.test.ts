import { describe, it, expect } from 'vitest';
import { supabase } from './supabase';

describe('Supabase Connection', () => {
  it('should connect to Supabase successfully', async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      console.log('Connection successful!');
      console.log('Test query result:', data);
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  });

  it('should have required environment variables', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });
});
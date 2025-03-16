import { supabase } from '../lib/supabase';

// Types
export interface Profile {
  id: string;
  role: 'admin' | 'lecturer' | 'student';
  full_name: string;
  email: string;
  avatar_url?: string;
  student_id?: string;
  last_sign_in_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Class {
  id: string;
  name: string;
  course_code: string;
  description?: string;
  lecturer_id: string;
  schedule?: string;
  location?: string;
  capacity?: number;
  status?: string;
  department?: string;
  semester?: string;
  academic_year?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface ClassSession {
  id: string;
  class_id: string;
  lecturer_id: string;
  start_time: string;
  end_time: string;
  qr_token?: string;
  active?: boolean;
  status?: 'scheduled' | 'in_progress' | 'completed';
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  marked_at: string;
  location_data?: any;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

// Database Service
export const databaseService = {
  // Profile Management
  async getCurrentProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(profile: Partial<Profile>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Class Management
  async createClass(classData: Omit<Class, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('classes')
      .insert(classData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getClassesByLecturer(lecturerId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_enrollments (count),
        class_sessions (
          attendance_records (count)
        )
      `)
      .eq('lecturer_id', lecturerId);

    if (error) throw error;
    return data;
  },

  async getStudentClasses(studentId: string) {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        classes (
          id,
          name,
          course_code,
          schedule,
          location,
          class_sessions (
            start_time,
            attendance_records (
              id,
              student_id
            )
          )
        )
      `)
      .eq('student_id', studentId);

    if (error) throw error;
    return data;
  },

  async deleteClass(classId: string) {
    console.log('Starting class deletion process for classId:', classId);

    try {
      // Get the current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      console.log('Current user:', user.id);

      // Verify ownership and get class details with explicit role check
      const { data: classData, error: classCheckError } = await supabase
        .from('classes')
        .select('*, profiles!classes_lecturer_id_fkey(role)')
        .eq('id', classId)
        .eq('lecturer_id', user.id)
        .single();

      console.log('Class check result:', { classData, classCheckError });

      if (classCheckError) {
        throw new Error(`Class check failed: ${classCheckError.message}`);
      }
      
      if (!classData) {
        throw new Error('Class not found or you do not have permission to delete it');
      }

      // Verify the user is a lecturer
      const profile = classData.profiles;
      if (!profile || profile.role !== 'lecturer') {
        throw new Error('Only lecturers can delete classes');
      }

      // Delete in sequence with detailed logging and error handling
      console.log('Starting deletion sequence...');

      // 1. Delete attendance records
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('class_id', classId);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(session => session.id);
        console.log('Deleting attendance records for sessions:', sessionIds);
        
        const { error: attendanceError } = await supabase
          .from('attendance_records')
          .delete()
          .in('session_id', sessionIds);

        if (attendanceError) {
          throw new Error(`Failed to delete attendance records: ${attendanceError.message}`);
        }
      }

      // 2. Delete sessions
      console.log('Deleting sessions...');
      const { error: sessionsError } = await supabase
        .from('class_sessions')
        .delete()
        .eq('class_id', classId);

      if (sessionsError) {
        throw new Error(`Failed to delete sessions: ${sessionsError.message}`);
      }

      // 3. Delete enrollments
      console.log('Deleting enrollments...');
      const { error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId);

      if (enrollmentsError) {
        throw new Error(`Failed to delete enrollments: ${enrollmentsError.message}`);
      }

      // 4. Delete the class itself with explicit RLS check
      console.log('Deleting class...');
      const { error: deleteError } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('lecturer_id', user.id); // Explicitly ensure lecturer ownership

      if (deleteError) {
        if (deleteError.code === '42501') { // PostgreSQL permission denied code
          throw new Error('Permission denied: RLS policy preventing deletion');
        }
        throw new Error(`Failed to delete class: ${deleteError.message}`);
      }

      // Final verification
      console.log('Verifying deletion...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('classes')
        .select()
        .eq('id', classId)
        .maybeSingle();

      if (verifyError) {
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      if (verifyData) {
        console.error('Class still exists after deletion');
        throw new Error('Class deletion failed: RLS policy is preventing deletion. Please check your database policies.');
      }

      console.log('Class deletion completed successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteClass:', error);
      throw error;
    }
  },

  async updateClass(classId: string, classData: Partial<Omit<Class, 'id' | 'created_at' | 'updated_at' | 'lecturer_id'>>) {
    try {
      // Get the current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First verify the class exists and user has permission
      const { data: classCheck } = await supabase
        .from('classes')
        .select('id')
        .eq('id', classId)
        .eq('lecturer_id', user.id)
        .single();

      if (!classCheck) {
        throw new Error('Class not found or you do not have permission to edit it');
      }

      // Update the class
      const { error: updateError } = await supabase
        .from('classes')
        .update({
          name: classData.name,
          course_code: classData.course_code,
          location: classData.location,
          capacity: classData.capacity,
          schedule: classData.schedule
        })
        .eq('id', classId)
        .eq('lecturer_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Fetch the updated class data
      const { data: updatedClass, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (fetchError || !updatedClass) {
        console.error('Fetch error:', fetchError);
        throw new Error('Failed to fetch updated class data');
      }

      return updatedClass;
    } catch (error) {
      console.error('Error in updateClass:', error);
      throw error;
    }
  },

  async createClassSession(session: Omit<ClassSession, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('class_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRecentSessions(lecturerId: string, limit = 5) {
    const { data, error } = await supabase
      .from('class_sessions')
      .select(`
        id,
        start_time,
        classes (
          name,
          location,
          class_enrollments (count)
        ),
        attendance_records (count)
      `)
      .eq('lecturer_id', lecturerId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Attendance Records
  async markAttendance(record: Omit<AttendanceRecord, 'id' | 'marked_at'>) {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getStudentAttendance(studentId: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        marked_at,
        class_sessions!inner (
          start_time,
          classes (
            name
          )
        )
      `)
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Notifications
  async getUserNotifications(userId: string, limit = 5) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  }
};

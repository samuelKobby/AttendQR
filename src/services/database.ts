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
    // Start a transaction to ensure all related data is deleted
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('class_id', classId);

    if (sessionsError) throw sessionsError;

    // Delete in this order to maintain referential integrity:
    // 1. Delete attendance records for all sessions
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(session => session.id);
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .delete()
        .in('session_id', sessionIds);

      if (attendanceError) throw attendanceError;
    }

    // 2. Delete all sessions
    const { error: deleteSessionsError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('class_id', classId);

    if (deleteSessionsError) throw deleteSessionsError;

    // 3. Delete all enrollments
    const { error: enrollmentsError } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('class_id', classId);

    if (enrollmentsError) throw enrollmentsError;

    // 4. Finally, delete the class itself
    const { error: classError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (classError) throw classError;

    return true;
  },

  // Class Sessions
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

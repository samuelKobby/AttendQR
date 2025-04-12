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
  updated_at?: string;
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

export interface StudentCreationData {
  email: string;
  full_name: string;
  temp_password: string;
  class_id?: string;
  student_id?: string; // Added student_id to the interface
}

export interface BulkStudentUploadData {
  students: StudentCreationData[];
}

export interface CreateStudentData {
  email: string;
  full_name: string;
  student_id?: string | null;
  class_id: string;
}

export interface DatabaseService {
  getCurrentProfile(): Promise<any>;
  updateProfile(profile: Partial<Profile>): Promise<any>;
  createClass(classData: Omit<Class, 'id' | 'created_at' | 'updated_at'>): Promise<any>;
  getClassesByLecturer(lecturerId: string): Promise<any>;
  getStudentClasses(studentId: string): Promise<any>;
  deleteClass(classId: string): Promise<any>;
  updateClass(classId: string, classData: Partial<Omit<Class, 'id' | 'created_at' | 'updated_at' | 'lecturer_id'>>): Promise<any>;
  getClass(classId: string): Promise<any>;
  createClassSession(session: Omit<ClassSession, 'id' | 'created_at'>): Promise<any>;
  getRecentSessions(lecturerId: string, limit?: number): Promise<any>;
  markAttendance(record: Omit<AttendanceRecord, 'id' | 'marked_at'>): Promise<any>;
  getStudentAttendance(studentId: string): Promise<any>;
  getUserNotifications(userId: string, limit?: number): Promise<any>;
  markNotificationAsRead(notificationId: string): Promise<any>;
  addStudent(data: StudentCreationData): Promise<any>;
  bulkAddStudents(data: BulkStudentUploadData): Promise<any>;
  enrollStudentInClass(classId: string, studentId: string): Promise<any>;
  getClassStudents(classId: string): Promise<any>;
  bulkUpdateStudentStatus(studentIds: string[], status: 'active' | 'inactive'): Promise<any>;
  bulkDeleteStudents(studentIds: string[]): Promise<any>;
  bulkResetPasswords(studentIds: string[]): Promise<any>;
  bulkAssignToClass(studentIds: string[], classId: string): Promise<any>;
  getAvailableClasses(): Promise<Array<{
    id: string;
    name: string;
    capacity: number;
    lecturer: string;
    availableSlots: number;
  }>>;
  createStudents(students: CreateStudentData[]): Promise<string[]>;
  createClassEnrollmentsTable(): Promise<boolean>;
  getStudentsInClass(classId: string): Promise<any>;
}

export const databaseService: DatabaseService = {
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

  async getClass(classId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) throw error;
    return data;
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
  },

  // Student Management
  async addStudent(data: StudentCreationData) {
    console.log('Starting student creation process:', { email: data.email });
    try {
      // First get current user's role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Authentication error: No user found');
        throw new Error('Not authenticated');
      }
      console.log('Current user:', { id: user.id });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }
      if (profile.role !== 'admin' && profile.role !== 'lecturer') {
        console.error('Permission denied: User is not authorized', { role: profile.role });
        throw new Error('Only admins and lecturers can add students');
      }
      console.log('Access verified for', profile.role);

      // Check if user already exists by email
      console.log('Checking for existing user with email:', data.email);
      
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', data.email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing user:', checkError);
        throw checkError;
      }

      if (existingUser) {
        console.error('User already exists:', existingUser);
        throw new Error(`A user with email ${data.email} already exists`);
      }

      // If student_id is provided, check if it's already in use
      if (data.student_id) {
        console.log('Checking if student ID is already in use:', data.student_id);
        const { data: existingStudentId, error: studentIdError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('student_id', data.student_id)
          .maybeSingle();

        if (studentIdError) {
          console.error('Error checking student ID:', studentIdError);
          throw studentIdError;
        }

        if (existingStudentId) {
          console.error('Student ID already in use:', existingStudentId);
          throw new Error(`Student ID ${data.student_id} is already assigned to another user`);
        }
      }

      // Create new user
      console.log('Creating new student user...');
      
      // Store current admin/lecturer session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No active session found');
      }
      
      let profileData: any = null;
      
      // Create new user
      const { data: authData, error: createUserError } = await supabase.auth.signUp({
        email: data.email,
        password: data.temp_password,
        options: {
          data: {
            role: 'student'
          }
        }
      });

      if (createUserError) {
        console.error('Failed to create user:', createUserError);
        throw createUserError;
      }

      if (!authData.user) {
        console.error('Failed to create user: No user data returned');
        throw new Error('Failed to create user');
      }
      console.log('Created auth user:', { id: authData.user.id });

      // Check if profile already exists for this auth user
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (existingProfile) {
        console.log('Profile already exists for this auth user, updating it...');
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            email: data.email,
            full_name: data.full_name,
            student_id: data.student_id,
            role: 'student'
          })
          .eq('id', authData.user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }

        profileData = updatedProfile;
        console.log('Updated existing profile:', profileData);
      } else {
        // Create student profile
        console.log('Creating student profile with data:', {
          id: authData.user.id,
          email: data.email,
          full_name: data.full_name,
          student_id: data.student_id,
          role: 'student'
        });
        
        try {
          const { data: profileInsertData, error: profileInsertError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: data.email,
              full_name: data.full_name,
              student_id: data.student_id,
              role: 'student'
            })
            .select()
            .single();

          if (profileInsertError) {
            console.error('Error creating profile:', profileInsertError);
            throw profileInsertError;
          }
          
          if (!profileInsertData) {
            throw new Error('No profile data returned after insert');
          }
          
          profileData = profileInsertData;
          console.log('Created student profile:', profileData);
        } catch (error) {
          console.error('Error creating profile, cleaning up auth user...');
          // Try to clean up the auth user since profile creation failed
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw error;
        }
      }

      // Restore admin/lecturer session
      const { error: restoreError } = await supabase.auth.setSession(sessionData.session);
      if (restoreError) {
        console.error('Error restoring session:', restoreError);
        // Continue anyway as we've already created the profile
      }

      // Enroll in class if provided
      if (data.class_id) {
        console.log('Attempting to enroll student in class:', { class_id: data.class_id });
        
        // Verify class exists first
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('id', data.class_id)
          .single();

        if (classError) {
          console.error('Error fetching class:', classError);
          throw classError;
        }
        if (!classData) {
          console.error('Class not found:', { class_id: data.class_id });
          throw new Error('Class not found');
        }
        console.log('Class verified');

        // Then enroll student
        console.log('Enrolling student in class:', { class_id: data.class_id, student_id: profileData.id });
        const { error: enrollError } = await supabase
          .from('class_enrollments')
          .insert({
            class_id: data.class_id,
            student_id: profileData.id,
            status: 'active'
          });

        if (enrollError) {
          console.error('Error enrolling student:', enrollError);
          throw enrollError;
        }
        console.log('Student enrolled in class');
      }

      console.log('Student creation completed successfully:', { id: profileData.id });
      return profileData;
    } catch (error) {
      console.error('Error in addStudent:', error);
      throw error;
    }
  },

  async bulkAddStudents(data: BulkStudentUploadData) {
    const results = {
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const student of data.students) {
      try {
        const result = await this.addStudent(student);
        results.successful.push({ email: student.email, result });
      } catch (error) {
        results.failed.push({ email: student.email, error });
      }
    }

    return results;
  },

  async enrollStudentInClass(classId: string, studentId: string) {
    console.log('Enrolling student in class:', { classId, studentId });
    const { data, error } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: classId,
        student_id: studentId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error in enrollStudentInClass:', error);
      throw error;
    }
    console.log('Successfully enrolled student:', data);
    return data;
  },

  async getClassStudents(classId: string) {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        *,
        profile:student_id(
          id,
          full_name,
          email
        )
      `)
      .eq('class_id', classId)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  },

  async bulkUpdateStudentStatus(studentIds: string[], status: 'active' | 'inactive') {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .in('id', studentIds)
      .eq('role', 'student');

    if (error) throw error;
  },

  async bulkDeleteStudents(studentIds: string[]) {
    // First delete all class enrollments
    const { error: enrollmentError } = await supabase
      .from('class_enrollments')
      .delete()
      .in('student_id', studentIds);

    if (enrollmentError) throw enrollmentError;

    // Delete attendance records
    const { error: attendanceError } = await supabase
      .from('attendance_records')
      .delete()
      .in('student_id', studentIds);

    if (attendanceError) throw attendanceError;

    // Delete profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .in('id', studentIds)
      .eq('role', 'student');

    if (profileError) throw profileError;

    // Delete auth users
    for (const id of studentIds) {
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) throw authError;
    }
  },

  async bulkResetPasswords(studentIds: string[]) {
    const results = [];
    for (const id of studentIds) {
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      // Reset password in auth
      const { error: authError } = await supabase.auth.admin.updateUserById(
        id,
        { password: tempPassword }
      );

      if (authError) throw authError;

      // Get student email
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', id)
        .single();

      if (studentError || !student) throw studentError;

      // Send password reset email
      await supabase.functions.invoke('send-email', {
        body: {
          to: student.email,
          subject: 'AttendQR - Your Password Has Been Reset',
          html: `
            <h2>Password Reset Notification</h2>
            <p>Your password has been reset by an administrator.</p>
            <p><strong>New Temporary Password:</strong> ${tempPassword}</p>
            <p>Please login and change your password as soon as possible.</p>
            <p>Best regards,<br>The AttendQR Team</p>
          `
        }
      });

      results.push({ id, email: student.email });
    }
    return results;
  },

  async bulkAssignToClass(studentIds: string[], classId: string) {
    // First verify the class exists and get its details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('name, capacity, lecturer_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) throw new Error('Class not found');

    // Check current enrollment count
    const { count, error: countError } = await supabase
      .from('class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (countError) throw countError;
    if (count === null) throw new Error('Failed to get enrollment count');

    // Verify capacity
    if (count + studentIds.length > classData.capacity) {
      throw new Error(`Cannot add ${studentIds.length} students. Class capacity would be exceeded.`);
    }

    // Get existing enrollments to avoid duplicates
    const { data: existingEnrollments, error: existingError } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', studentIds);

    if (existingError) throw existingError;

    const existingStudentIds = existingEnrollments?.map(e => e.student_id) || [];
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));

    if (newStudentIds.length === 0) {
      throw new Error('All selected students are already enrolled in this class');
    }

    // Insert new enrollments
    const { error: enrollError } = await supabase
      .from('class_enrollments')
      .insert(
        newStudentIds.map(studentId => ({
          class_id: classId,
          student_id: studentId,
          status: 'active'
        }))
      );

    if (enrollError) throw enrollError;

    // Get student emails for notifications
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', newStudentIds);

    if (studentsError || !students) throw studentsError;

    // Send enrollment notifications
    for (const student of students) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: student.email,
          subject: `Enrolled in ${classData.name}`,
          html: `
            <h2>Class Enrollment Notification</h2>
            <p>You have been enrolled in the class: ${classData.name}</p>
            <p>You can now access this class through your dashboard.</p>
            <p>Best regards,<br>The AttendQR Team</p>
          `
        }
      });
    }

    return {
      enrolled: newStudentIds.length,
      alreadyEnrolled: existingStudentIds.length,
      className: classData.name
    };
  },

  async getAvailableClasses() {
    // Get classes with enrollment counts
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select(`
        *,
        enrollments:class_enrollments(count)
      `)
      .eq('status', 'active');

    console.log('Raw classes with enrollments:', classes); // Debug log

    if (classError) {
      console.error('Error fetching classes:', classError);
      throw classError;
    }

    if (!classes || classes.length === 0) {
      console.log('No classes found');
      return [];
    }

    // Get lecturer names
    const { data: lecturers, error: lecturerError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', classes.map(c => c.lecturer_id));

    console.log('Lecturers:', lecturers); // Debug log

    if (lecturerError) {
      console.error('Error fetching lecturers:', lecturerError);
      throw lecturerError;
    }

    // Map everything together
    return classes.map(cls => {
      const lecturer = lecturers?.find(l => l.id === cls.lecturer_id);
      const enrollmentCount = cls.enrollments?.[0]?.count || 0;
      
      return {
        id: cls.id,
        name: cls.name,
        capacity: cls.capacity || 0,
        lecturer: lecturer?.full_name || 'Unknown',
        availableSlots: (cls.capacity || 0) - enrollmentCount
      };
    });
  },

  async createStudents(students: CreateStudentData[]) {
    const results = [];
    const errors = [];

    for (const student of students) {
      try {
        // Generate temporary password
        const tempPassword = `${student.email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`;

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: student.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: student.full_name,
            role: 'student',
            ...(student.student_id ? { student_id: student.student_id } : {}),
          },
        });

        if (authError) throw authError;

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: student.email,
            full_name: student.full_name,
            role: 'student',
            student_id: student.student_id,
          });

        if (profileError) throw profileError;

        // Create class enrollment
        const { error: enrollError } = await supabase
          .from('class_enrollments')
          .insert({
            class_id: student.class_id,
            student_id: authData.user.id,
            status: 'active',
          });

        if (enrollError) throw enrollError;

        // Get class details for email
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('name')
          .eq('id', student.class_id)
          .single();

        if (classError || !classData) {
          throw new Error('Failed to fetch class details');
        }

        // Send enrollment email
        await supabase.functions.invoke('send-email', {
          body: {
            to: student.email,
            subject: `Welcome to AttendQR - Class Enrollment`,
            html: `
              <h2>Welcome to AttendQR!</h2>
              <p>Your account has been created and you've been enrolled in ${classData.name}.</p>
              <p>Here are your login credentials:</p>
              <p><strong>Email:</strong> ${student.email}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p>Please login and change your password as soon as possible.</p>
              <p>Best regards,<br>The AttendQR Team</p>
            `
          }
        });

        results.push(authData.user.id);
      } catch (error) {
        console.error(`Error creating student ${student.email}:`, error);
        errors.push({ email: student.email, error });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to create ${errors.length} students. First error: ${errors[0].error.message}`);
    }

    return results;
  },

  async createClassEnrollmentsTable() {
    const { error } = await supabase.rpc('create_class_enrollments_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.class_enrollments (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
          student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          UNIQUE(class_id, student_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON public.class_enrollments(class_id);
        CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON public.class_enrollments(student_id);
        CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON public.class_enrollments(status);
      `
    });

    if (error) {
      console.error('Error creating class_enrollments table:', error);
      throw error;
    }

    return true;
  },

  async getStudentsInClass(classId: string) {
    // First get all enrollments for the class
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_enrollments')
      .select('student_id, status')
      .eq('class_id', classId);

    if (enrollError) throw enrollError;

    if (!enrollments?.length) {
      return [];
    }

    // Then get the student profiles
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, student_id')
      .in('id', enrollments.map(e => e.student_id));

    if (studentsError) throw studentsError;

    // Combine profile data with enrollment status
    return students?.map(student => ({
      ...student,
      status: enrollments.find(e => e.student_id === student.id)?.status || 'inactive'
    })) || [];
  },
};

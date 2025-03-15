import { supabase } from '../lib/supabase';

async function seedAttendanceData() {
  try {
    console.log('Starting to seed attendance data...');

    // Get all active classes
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, lecturer_id')
      .eq('status', 'active');

    if (classError) throw classError;
    if (!classes?.length) {
      console.log('No active classes found');
      return;
    }

    // Create class sessions for the past month
    const sessions = [];
    const now = new Date();
    for (const cls of classes) {
      // Create 4 sessions (one per week) for each class
      for (let i = 0; i < 4; i++) {
        const sessionDate = new Date(now);
        sessionDate.setDate(now.getDate() - (i * 7)); // Go back by weeks
        
        // Set session time to 9 AM
        sessionDate.setHours(9, 0, 0, 0);
        
        sessions.push({
          id: crypto.randomUUID(),
          class_id: cls.id,
          lecturer_id: cls.lecturer_id,
          start_time: sessionDate.toISOString(),
          end_time: new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
          status: 'completed'
        });
      }
    }

    // Insert sessions
    const { error: sessionError } = await supabase
      .from('class_sessions')
      .insert(sessions);

    if (sessionError) throw sessionError;
    console.log(`Created ${sessions.length} class sessions`);

    // Get all students
    const { data: students, error: studentError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student');

    if (studentError) throw studentError;
    if (!students?.length) {
      console.log('No students found');
      return;
    }

    // Get class enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .select('class_id, student_id');

    if (enrollmentError) throw enrollmentError;
    if (!enrollments?.length) {
      console.log('No enrollments found');
      return;
    }

    // Create attendance records
    const attendanceRecords = [];
    for (const session of sessions) {
      // Get students enrolled in this class
      const classEnrollments = enrollments.filter(e => e.class_id === session.class_id);
      
      for (const enrollment of classEnrollments) {
        // 80% chance of being present
        const isPresent = Math.random() < 0.8;
        
        // For present students, mark attendance within first 15 minutes
        const markedAt = isPresent 
          ? new Date(new Date(session.start_time).getTime() + Math.random() * 15 * 60 * 1000).toISOString()
          : null;

        attendanceRecords.push({
          id: crypto.randomUUID(),
          session_id: session.id,
          student_id: enrollment.student_id,
          status: isPresent ? 'present' : 'absent',
          marked_at: markedAt
        });
      }
    }

    // Insert attendance records in chunks to avoid payload size limits
    const chunkSize = 100;
    for (let i = 0; i < attendanceRecords.length; i += chunkSize) {
      const chunk = attendanceRecords.slice(i, i + chunkSize);
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .insert(chunk);

      if (attendanceError) throw attendanceError;
    }
    console.log(`Created ${attendanceRecords.length} attendance records`);

    // Update student last_sign_in_at and status based on attendance
    for (const student of students) {
      const latestAttendance = attendanceRecords
        .filter(ar => ar.student_id === student.id && ar.status === 'present')
        .sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime())[0];

      if (latestAttendance?.marked_at) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            last_sign_in_at: latestAttendance.marked_at,
            status: new Date(latestAttendance.marked_at) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              ? 'active'
              : 'inactive'
          })
          .eq('id', student.id);

        if (updateError) throw updateError;
      }
    }

    console.log('Successfully seeded attendance data!');
  } catch (error) {
    console.error('Error seeding attendance data:', error);
  }
}

// Run the seeding function
seedAttendanceData();

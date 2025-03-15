-- First, create class sessions for each class for the past month (4 sessions per class, one per week)
WITH RECURSIVE dates AS (
  SELECT current_date - interval '28 days' as date
  UNION ALL
  SELECT date + interval '7 days'
  FROM dates
  WHERE date < current_date
)
INSERT INTO class_sessions (id, class_id, lecturer_id, start_time, end_time, status)
SELECT 
  gen_random_uuid(),
  c.id,
  c.lecturer_id,
  (d.date + time '09:00:00')::timestamp as start_time,
  (d.date + time '11:00:00')::timestamp as end_time,
  'completed' as status
FROM classes c
CROSS JOIN dates d
WHERE c.status = 'active';

-- Create attendance records for each session with realistic attendance patterns
WITH student_sessions AS (
  SELECT 
    cs.id as session_id,
    ce.student_id,
    cs.start_time,
    -- 80% chance of being present
    CASE WHEN random() < 0.8 THEN 'present' ELSE 'absent' END as status
  FROM 
    class_sessions cs
    JOIN class_enrollments ce ON cs.class_id = ce.class_id
)
INSERT INTO attendance_records (id, session_id, student_id, status, marked_at)
SELECT 
  gen_random_uuid(),
  session_id,
  student_id,
  status,
  -- For present students, mark attendance within first 15 minutes of class
  CASE 
    WHEN status = 'present' 
    THEN start_time + (random() * interval '15 minutes')
    ELSE NULL
  END as marked_at
FROM student_sessions;

-- Update the last active time for students based on their latest attendance
UPDATE profiles p
SET last_sign_in_at = (
  SELECT MAX(marked_at)
  FROM attendance_records ar
  WHERE ar.student_id = p.id
  AND ar.status = 'present'
)
WHERE p.role = 'student'
AND EXISTS (
  SELECT 1 
  FROM attendance_records ar 
  WHERE ar.student_id = p.id
  AND ar.status = 'present'
);

-- Update student status (active/inactive) based on their last activity
-- Students who haven't been active in the last 30 days are marked as inactive
UPDATE profiles
SET status = 
  CASE 
    WHEN last_sign_in_at > current_timestamp - interval '30 days' THEN 'active'
    ELSE 'inactive'
  END
WHERE role = 'student';

-- Add some statistics to the classes table
WITH class_stats AS (
  SELECT 
    cs.class_id,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(DISTINCT ar.student_id) as total_students,
    ROUND(AVG(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) * 100) as avg_attendance
  FROM 
    class_sessions cs
    LEFT JOIN attendance_records ar ON cs.id = ar.session_id
  GROUP BY cs.class_id
)
UPDATE classes c
SET 
  total_sessions = cs.total_sessions,
  total_students = cs.total_students,
  attendance_rate = cs.avg_attendance
FROM class_stats cs
WHERE c.id = cs.class_id;

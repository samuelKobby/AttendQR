-- Create some class sessions for the past month
INSERT INTO class_sessions (id, class_id, lecturer_id, start_time, end_time, status)
SELECT 
  gen_random_uuid(),
  c.id,
  c.lecturer_id,
  date + time '09:00:00' as start_time,
  date + time '11:00:00' as end_time,
  'completed' as status
FROM 
  classes c,
  generate_series(
    current_date - interval '30 days',
    current_date,
    '1 week'::interval
  ) as date
WHERE 
  c.status = 'active';

-- Create attendance records for each session
WITH student_sessions AS (
  SELECT 
    cs.id as session_id,
    ce.student_id,
    cs.start_time,
    -- Randomly mark some students as present (80% chance) and others as absent
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
FROM 
  student_sessions;

-- Update the last_active timestamp for students who attended classes
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

-- Update student status based on last activity
UPDATE profiles
SET status = 
  CASE 
    WHEN last_sign_in_at > current_timestamp - interval '30 days' THEN 'active'
    ELSE 'inactive'
  END
WHERE role = 'student';

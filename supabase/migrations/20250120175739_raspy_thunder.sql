/*
  # Add notifications support
  
  1. New Tables
    - notifications
      - id (uuid, primary key)
      - user_id (uuid, references profiles)
      - title (text)
      - message (text) 
      - type (text - info/warning/success)
      - read (boolean)
      - timestamp (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for users to view their own notifications
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type IN ('info', 'warning', 'success')),
  read boolean DEFAULT false,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create attendance notifications
CREATE OR REPLACE FUNCTION create_attendance_notification()
RETURNS trigger AS $$
BEGIN
  -- Calculate attendance rate for the student
  WITH student_stats AS (
    SELECT 
      COUNT(DISTINCT cs.id) as total_sessions,
      COUNT(DISTINCT ar.id) as attended_sessions
    FROM class_sessions cs
    JOIN class_enrollments ce ON ce.class_id = cs.class_id
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = NEW.student_id
    WHERE ce.student_id = NEW.student_id
  )
  SELECT
    CASE
      WHEN (attended_sessions::float / NULLIF(total_sessions, 0) * 100) < 75 THEN
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
          NEW.student_id,
          'Low Attendance Warning',
          'Your attendance has fallen below 75%. Please ensure you attend upcoming classes.',
          'warning'
        )
      ELSE
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
          NEW.student_id,
          'Attendance Marked',
          'Your attendance has been recorded successfully.',
          'success'
        )
    END
  FROM student_stats;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for attendance notifications
CREATE TRIGGER attendance_notification_trigger
  AFTER INSERT ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION create_attendance_notification();
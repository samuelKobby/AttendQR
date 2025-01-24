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
DECLARE
  v_attendance_rate numeric;
  v_total_sessions bigint;
  v_attended_sessions bigint;
BEGIN
  -- Calculate attendance rate
  SELECT 
    COUNT(DISTINCT cs.id),
    COUNT(DISTINCT ar.id)
  INTO 
    v_total_sessions,
    v_attended_sessions
  FROM class_sessions cs
  JOIN class_enrollments ce ON ce.class_id = cs.class_id
  LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = NEW.student_id
  WHERE ce.student_id = NEW.student_id;

  IF v_total_sessions > 0 THEN
    v_attendance_rate := (v_attended_sessions::numeric / v_total_sessions) * 100;
  ELSE
    v_attendance_rate := 100;
  END IF;

  -- Insert appropriate notification
  IF v_attendance_rate < 75 THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.student_id,
      'Low Attendance Warning',
      'Your attendance has fallen below 75%. Please ensure you attend upcoming classes.',
      'warning'
    );
  ELSE
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.student_id,
      'Attendance Marked',
      'Your attendance has been recorded successfully.',
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for attendance notifications
CREATE TRIGGER attendance_notification_trigger
  AFTER INSERT ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION create_attendance_notification();
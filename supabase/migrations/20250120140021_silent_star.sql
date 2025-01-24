/*
  # Create attendance system tables

  1. New Tables
    - `class_sessions`
      - `id` (uuid, primary key)
      - `class_id` (uuid, references classes)
      - `lecturer_id` (uuid, references auth.users)
      - `qr_token` (text, unique)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `created_at` (timestamptz)
      - `active` (boolean)

    - `attendance_records`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references class_sessions)
      - `student_id` (uuid, references auth.users)
      - `signature` (text)
      - `marked_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for lecturers to manage their sessions
    - Add policies for students to view and mark attendance
*/

-- Create class_sessions table
CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id),
  lecturer_id uuid NOT NULL REFERENCES auth.users(id),
  qr_token text UNIQUE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  CHECK (end_time > start_time)
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES class_sessions(id),
  student_id uuid NOT NULL REFERENCES auth.users(id),
  signature text NOT NULL,
  marked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for class_sessions
CREATE POLICY "Lecturers can create sessions for their classes"
  ON class_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = lecturer_id AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_id AND lecturer_id = auth.uid()
    )
  );

CREATE POLICY "Lecturers can view their own sessions"
  ON class_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = lecturer_id OR
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_id AND
      c.id IN (
        SELECT class_id FROM class_enrollments
        WHERE student_id = auth.uid()
      )
    )
  );

-- Policies for attendance_records
CREATE POLICY "Students can mark their own attendance"
  ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = session_id
      AND cs.active = true
      AND now() BETWEEN cs.start_time AND cs.end_time
    )
  );

CREATE POLICY "Users can view attendance records they're authorized to see"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = session_id AND cs.lecturer_id = auth.uid()
    )
  );
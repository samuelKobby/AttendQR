-- Add active field to class_sessions table
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;

-- Add qr_token field to class_sessions table
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS qr_token TEXT;

-- Rename qr_code_data to qr_data for consistency (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'class_sessions'
        AND column_name = 'qr_code_data'
    ) THEN
        ALTER TABLE class_sessions RENAME COLUMN qr_code_data TO qr_data;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_active ON class_sessions(active);
CREATE INDEX IF NOT EXISTS idx_class_sessions_qr_token ON class_sessions(qr_token);

-- Add policy for updating class sessions
CREATE POLICY "Lecturers can update their own sessions"
    ON class_sessions FOR UPDATE
    TO authenticated
    USING (lecturer_id = auth.uid())
    WITH CHECK (lecturer_id = auth.uid());

-- Add policy for inserting class sessions
CREATE POLICY "Lecturers can create sessions for their classes"
    ON class_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        lecturer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_id
            AND classes.lecturer_id = auth.uid()
        )
    );

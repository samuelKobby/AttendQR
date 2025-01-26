-- Drop existing policies and triggers
DROP POLICY IF EXISTS "Lecturers can delete their own classes" ON classes;
DROP TRIGGER IF EXISTS cascade_delete_class_sessions ON classes;
DROP FUNCTION IF EXISTS delete_class_sessions();

-- Create improved delete policy for classes that checks lecturer role
CREATE POLICY "Lecturers can delete their own classes"
    ON classes FOR DELETE
    TO authenticated
    USING (
        lecturer_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'lecturer'
        )
    );

-- Create improved cascade delete function that handles all related records
CREATE OR REPLACE FUNCTION delete_class_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- First delete attendance records for all sessions of this class
    DELETE FROM attendance_records 
    WHERE session_id IN (
        SELECT id FROM class_sessions 
        WHERE class_id = OLD.id
    );
    
    -- Then delete all sessions
    DELETE FROM class_sessions 
    WHERE class_id = OLD.id;
    
    -- Finally delete all enrollments
    DELETE FROM class_enrollments 
    WHERE class_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle cascade deletion
CREATE TRIGGER cascade_delete_class
    BEFORE DELETE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION delete_class_cascade();

-- Grant necessary permissions
GRANT DELETE ON classes TO authenticated;
GRANT DELETE ON class_sessions TO authenticated;
GRANT DELETE ON class_enrollments TO authenticated;
GRANT DELETE ON attendance_records TO authenticated;

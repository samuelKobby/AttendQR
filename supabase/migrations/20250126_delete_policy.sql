-- Add delete policy for classes
CREATE POLICY "Lecturers can delete their own classes"
    ON classes FOR DELETE
    TO authenticated
    USING (lecturer_id = auth.uid());

-- Add cascade delete trigger for class_sessions
CREATE OR REPLACE FUNCTION delete_class_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM class_sessions WHERE class_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cascade_delete_class_sessions
    BEFORE DELETE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION delete_class_sessions();

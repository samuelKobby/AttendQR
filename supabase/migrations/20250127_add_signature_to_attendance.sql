-- Add signature column to attendance_records table
ALTER TABLE attendance_records
ADD COLUMN signature TEXT NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN attendance_records.signature IS 'Student signature in base64 format for attendance verification';

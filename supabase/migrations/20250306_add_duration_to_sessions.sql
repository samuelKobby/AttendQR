-- Add duration_minutes column to class_sessions table
ALTER TABLE public.class_sessions 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 5;

-- Update existing sessions to have a default duration if needed
UPDATE public.class_sessions 
SET duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60
WHERE duration_minutes = 5;

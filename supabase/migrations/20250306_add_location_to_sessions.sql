-- Add location columns to class_sessions table
ALTER TABLE class_sessions
ADD COLUMN latitude TEXT,
ADD COLUMN longitude TEXT,
ADD COLUMN active BOOLEAN DEFAULT true;

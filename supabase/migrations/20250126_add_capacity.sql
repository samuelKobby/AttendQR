-- Add capacity field to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Add status field to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add department field to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department TEXT;

-- Add semester field to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS semester TEXT;

-- Add academic_year field to classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- Add description field if it doesn't exist
ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;

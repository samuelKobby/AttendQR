/*
  # Update classes table foreign key

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint referencing profiles table
  
  2. Security
    - Ensures data integrity by linking to profiles table
*/

-- Drop existing foreign key constraint
ALTER TABLE classes
DROP CONSTRAINT IF EXISTS classes_lecturer_id_fkey;

-- Add new foreign key constraint referencing profiles table
ALTER TABLE classes
ADD CONSTRAINT classes_lecturer_id_fkey
  FOREIGN KEY (lecturer_id)
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;
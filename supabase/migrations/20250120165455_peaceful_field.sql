/*
  # Disable RLS for classes table

  1. Changes
    - Drop all existing policies
    - Disable RLS on classes table
  
  2. Security
    - Remove RLS restrictions temporarily
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "view_classes" ON classes;
DROP POLICY IF EXISTS "manage_classes" ON classes;

-- Disable RLS
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
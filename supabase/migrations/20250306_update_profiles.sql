-- Add any missing columns to profiles table
-- Add student_id column to profiles table if it doesn't exist
alter table public.profiles 
add column if not exists student_id text;

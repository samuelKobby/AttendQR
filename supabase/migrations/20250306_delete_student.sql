-- Drop existing function if it exists
drop function if exists public.delete_student(uuid);

-- Create a function to delete a student and all associated data
create or replace function public.delete_student(p_student_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete all attendance records first
  delete from public.attendance_records
  where student_id = p_student_id;

  -- Delete student's class enrollments
  delete from public.class_enrollments
  where student_id = p_student_id;

  -- Delete the profile
  delete from public.profiles
  where id = p_student_id;

  -- Delete the auth.user
  delete from auth.users
  where id = p_student_id;
end;
$$;

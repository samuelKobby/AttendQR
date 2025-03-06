-- Drop existing function if it exists
drop function if exists public.delete_lecturer(uuid);

-- Create a function to delete a lecturer and all associated data
create or replace function public.delete_lecturer(p_lecturer_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete all class sessions first (they reference classes)
  delete from public.class_sessions
  where lecturer_id = p_lecturer_id;

  -- Delete all classes associated with the lecturer
  delete from public.classes
  where lecturer_id = p_lecturer_id;

  -- Delete the profile
  delete from public.profiles
  where id = p_lecturer_id;

  -- Delete the auth.user
  delete from auth.users
  where id = p_lecturer_id;
end;
$$;

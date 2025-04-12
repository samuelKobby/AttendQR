-- Clean up any duplicate student_ids first
WITH duplicates AS (
  SELECT student_id, array_agg(id ORDER BY created_at ASC) as ids
  FROM public.profiles
  WHERE student_id IS NOT NULL
  GROUP BY student_id
  HAVING COUNT(*) > 1
)
UPDATE public.profiles p
SET student_id = NULL
FROM duplicates d
WHERE p.student_id = d.student_id
AND p.id != (d.ids)[1];

-- Add unique constraint on student_id (allowing nulls)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_student_id_key;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_student_id_key UNIQUE (student_id)
DEFERRABLE INITIALLY DEFERRED;

-- Add a check constraint to ensure student_id is not empty when provided
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_student_id_not_empty;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_student_id_not_empty 
CHECK (student_id IS NULL OR length(trim(student_id)) > 0);

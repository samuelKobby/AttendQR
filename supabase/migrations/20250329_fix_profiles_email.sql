-- Drop any existing unique constraint on email
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Clean up any duplicate emails
WITH duplicates AS (
  SELECT email, array_agg(id ORDER BY created_at ASC) as ids
  FROM public.profiles
  WHERE email IS NOT NULL
  GROUP BY email
  HAVING COUNT(*) > 1
)
DELETE FROM public.profiles p
USING duplicates d
WHERE p.email = d.email
AND p.id != (d.ids)[1];

-- Add unique constraint on email
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Make email required
ALTER TABLE public.profiles
ALTER COLUMN email SET NOT NULL;

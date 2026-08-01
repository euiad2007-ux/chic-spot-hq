INSERT INTO public.salon_members (user_id, salon_id, branch_id, role)
SELECT u.id, NULL, NULL, 'platform_owner'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'euiad2007@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.salon_members m
    WHERE m.user_id = u.id AND m.role = 'platform_owner'
  );
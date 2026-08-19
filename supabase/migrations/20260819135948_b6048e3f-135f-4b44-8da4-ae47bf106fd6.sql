
-- Fix SECURITY DEFINER function accessibility as per security linter
REVOKE EXECUTE ON FUNCTION public.check_is_admin(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_is_admin(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_is_admin(UUID) FROM anon;

-- Grant execute only to service_role (used in RLS policies)
GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO postgres;

-- Fix handle_new_user_profile accessibility
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM anon;

-- Grant execute to service_role and postgres (needed for trigger)
GRANT EXECUTE ON FUNCTION public.handle_new_user_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_profile() TO postgres;

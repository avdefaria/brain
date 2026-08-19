-- 1. Set search_path and revoke public/authenticated execute permissions for handle_new_user_role
ALTER FUNCTION public.handle_new_user_role() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon;

-- Grant execute only to service_role (needed for trigger)
GRANT EXECUTE ON FUNCTION public.handle_new_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_role() TO postgres;
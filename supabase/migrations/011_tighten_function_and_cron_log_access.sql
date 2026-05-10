-- Make cron log access explicit for trusted server-side/service-role operations only.
CREATE POLICY "Service role can read cron logs" ON public.cron_sync_logs
  FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can insert cron logs" ON public.cron_sync_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- SECURITY DEFINER trigger helpers should not be callable as public RPCs.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

import { supabase } from "@/integrations/supabase/client";

/**
 * Log a security-related event, typically a failed database operation (e.g. RLS violation)
 */
export async function logSecurityEvent(params: {
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  tableName: string;
  recordId?: string;
  details?: any;
  errorMessage: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('security_logs').insert({
      user_id: user?.id,
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId,
      details: params.details,
      error_message: params.errorMessage
    });
  } catch (e) {
    console.error('Failed to log security event:', e);
  }
}

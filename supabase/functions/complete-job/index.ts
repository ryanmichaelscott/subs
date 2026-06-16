import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { lead_notification_id, job_request_id, contractor_id } = await req.json()

    if (!lead_notification_id || !contractor_id) {
      return new Response(JSON.stringify({ error: 'lead_notification_id and contractor_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: notifError } = await supabase
      .from('lead_notifications')
      .update({ status: 'completed', responded_at: new Date().toISOString() })
      .eq('id', lead_notification_id)
      .eq('contractor_id', contractor_id)

    if (notifError) throw notifError

    if (job_request_id) {
      await supabase
        .from('job_requests')
        .update({ status: 'completed' })
        .eq('id', job_request_id)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('complete-job error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

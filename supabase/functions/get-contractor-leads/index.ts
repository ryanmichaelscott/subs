import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { contractor_id } = await req.json()

    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase
      .from('lead_notifications')
      .select(`
        id,
        job_request_id,
        contractor_id,
        status,
        notified_at,
        responded_at,
        job_requests (
          id,
          trade,
          description,
          zip,
          state,
          preferred_date,
          member_name,
          member_email,
          status,
          expires_at,
          submitted_at
        )
      `)
      .eq('contractor_id', contractor_id)
      .order('notified_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    const now = new Date().toISOString()

    const leads = (data || [])
      .filter(n => {
        const req = n.job_requests as any
        if (!req) return false
        // Always show accepted/declined (history)
        if (n.status !== 'pending') return true
        // For pending: hide if lead itself is expired or accepted by someone else
        if (req.expires_at && req.expires_at < now) return false
        if (req.status !== 'open') return false
        return true
      })
      .map(n => {
        const req = n.job_requests as any
        const expiresAt = req?.expires_at ? new Date(req.expires_at).getTime() : null
        const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 0
        return {
          id: n.id,
          job_request_id: n.job_request_id,
          contractor_id: n.contractor_id,
          notification_status: n.status,
          member: req?.member_name || 'SUBS Member',
          zip: req?.zip || '',
          state: req?.state || '',
          service: req?.trade || '',
          description: req?.description || '',
          preferred_date: req?.preferred_date || null,
          submitted_at: req?.submitted_at || n.notified_at,
          expires_at: req?.expires_at || null,
          seconds_left: secondsLeft,
          lead_status: req?.status || 'open',
        }
      })

    return new Response(
      JSON.stringify({ success: true, leads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('get-contractor-leads error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

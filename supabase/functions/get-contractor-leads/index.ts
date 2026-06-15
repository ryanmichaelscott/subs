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
          clerk_user_id,
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

    let leads = (data || [])
      .filter(n => {
        const req = n.job_requests as any
        if (!req) return false
        if (n.status !== 'pending') return true
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
          member_email: req?.member_email || null,
          member_phone: null as string | null,
          clerk_user_id: req?.clerk_user_id || null,
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

    // For accepted leads, fetch member phone numbers
    const acceptedLeads = leads.filter(l => l.notification_status === 'accepted' && l.clerk_user_id)
    if (acceptedLeads.length > 0) {
      const clerkIds = [...new Set(acceptedLeads.map(l => l.clerk_user_id as string))]
      const { data: members } = await supabase
        .from('members')
        .select('clerk_user_id, phone')
        .in('clerk_user_id', clerkIds)

      if (members && members.length > 0) {
        const phoneMap: Record<string, string> = {}
        for (const m of members) {
          if (m.clerk_user_id && m.phone) phoneMap[m.clerk_user_id] = m.phone
        }
        leads = leads.map(l =>
          l.notification_status === 'accepted' && l.clerk_user_id && phoneMap[l.clerk_user_id]
            ? { ...l, member_phone: phoneMap[l.clerk_user_id] }
            : l
        )
      }
    }

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

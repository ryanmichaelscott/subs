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

    // For accepted leads, fetch member phone + email from members table as fallback
    const acceptedLeads = leads.filter(l => l.notification_status === 'accepted' && l.clerk_user_id)
    if (acceptedLeads.length > 0) {
      const clerkIds = [...new Set(acceptedLeads.map(l => l.clerk_user_id as string))]
      const { data: members } = await supabase
        .from('members')
        .select('clerk_user_id, phone, email, name')
        .in('clerk_user_id', clerkIds)

      if (members && members.length > 0) {
        const memberMap: Record<string, { phone?: string; email?: string; name?: string }> = {}
        for (const m of members) {
          if (m.clerk_user_id) memberMap[m.clerk_user_id] = { phone: m.phone, email: m.email, name: m.name }
        }
        leads = leads.map(l => {
          if (l.notification_status !== 'accepted' || !l.clerk_user_id) return l
          const m = memberMap[l.clerk_user_id]
          if (!m) return l
          return {
            ...l,
            member_phone: l.member_phone || m.phone || null,
            member_email: l.member_email || m.email || null,
            member: l.member && l.member !== 'SUBS Member' ? l.member : (m.name || l.member),
          }
        })
      }
    }

    // For completed leads, fetch reviews
    const completedLeads = leads.filter(l => l.notification_status === 'completed')
    if (completedLeads.length > 0) {
      const jobIds = completedLeads.map(l => l.job_request_id).filter(Boolean)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('job_request_id, rating, comment, created_at')
        .in('job_request_id', jobIds)

      if (reviews && reviews.length > 0) {
        const reviewMap: Record<string, any> = {}
        for (const r of reviews) reviewMap[r.job_request_id] = r
        leads = leads.map(l =>
          l.notification_status === 'completed' && l.job_request_id && reviewMap[l.job_request_id]
            ? { ...l, review: reviewMap[l.job_request_id] }
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

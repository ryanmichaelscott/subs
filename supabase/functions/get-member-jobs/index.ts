import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { clerk_user_id } = await req.json()
    if (!clerk_user_id) {
      return new Response(JSON.stringify({ error: 'clerk_user_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: jobs, error } = await supabase
      .from('job_requests')
      .select('*')
      .eq('clerk_user_id', clerk_user_id)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // For accepted/completed jobs, fetch contractor contact info
    const contractorIds = [...new Set(
      (jobs || [])
        .map((j: any) => j.accepted_contractor_id || j.contractor_id)
        .filter(Boolean)
    )]

    let contractorMap: Record<string, any> = {}
    if (contractorIds.length > 0) {
      const { data: contractors } = await supabase
        .from('contractors')
        .select('id, name, contact_name, phone, contact_email, trade')
        .in('id', contractorIds)
      if (contractors) {
        for (const c of contractors) contractorMap[c.id] = c
      }
    }

    const enriched = (jobs || []).map((j: any) => {
      const cid = j.accepted_contractor_id || j.contractor_id
      return {
        ...j,
        contractor: cid ? contractorMap[cid] ?? null : null,
      }
    })

    return new Response(JSON.stringify({ jobs: enriched }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('get-member-jobs error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

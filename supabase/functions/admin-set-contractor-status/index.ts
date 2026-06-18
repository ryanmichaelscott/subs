import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_STATUSES = ['active', 'approved', 'rejected', 'pending']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { contractor_id, status } = await req.json()
    if (!contractor_id || !status) {
      return new Response(JSON.stringify({ error: 'contractor_id and status required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (!VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: `Invalid status: ${status}` }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase
      .from('contractors')
      .update({ status })
      .eq('id', contractor_id)
      .select('id, name, status')
      .single()

    if (error) throw new Error(error.message)

    return new Response(JSON.stringify({ success: true, contractor: data }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('admin-set-contractor-status error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

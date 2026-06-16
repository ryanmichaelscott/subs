import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { state } = await req.json()
    if (!state) {
      return new Response(JSON.stringify({ error: 'state required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: contractors, error } = await supabase
      .from('contractors')
      .select('id, service_area')
      .eq('status', 'active')

    if (error) throw error

    let count = 0
    for (const c of contractors || []) {
      let sa = c.service_area
      if (typeof sa === 'string') { try { sa = JSON.parse(sa) } catch { sa = null } }
      // No service_area or no state restriction = covers everywhere
      if (!sa || !sa.state) { count++; continue }
      if (sa.state === state) count++
    }

    return new Response(JSON.stringify({ covered: count >= 3, count, state }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('check-state-coverage error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

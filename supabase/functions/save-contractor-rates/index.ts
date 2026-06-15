import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { contractor_id, rates } = await req.json()

    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Validate: member rate must not exceed market rate
    for (const r of rates || []) {
      const member = parseFloat(r.memberRate)
      const market = parseFloat(r.marketRate)
      if (r.memberRate && r.marketRate && !isNaN(member) && !isNaN(market) && member > market) {
        return new Response(JSON.stringify({
          error: `"${r.service}": SUBS rate ($${member}) cannot exceed market rate ($${market}).`,
        }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Replace all rates for this contractor
    await supabase.from('contractor_rates').delete().eq('contractor_id', contractor_id)

    const validRows = (rates || []).filter((r: any) => r.service?.trim() && r.memberRate)
    if (validRows.length > 0) {
      const { error } = await supabase.from('contractor_rates').insert(
        validRows.map((r: any) => ({
          contractor_id,
          service_name: r.service.trim(),
          member_price: String(r.memberRate),
          market_price: r.marketRate ? String(r.marketRate) : null,
        }))
      )
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, saved: validRows.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

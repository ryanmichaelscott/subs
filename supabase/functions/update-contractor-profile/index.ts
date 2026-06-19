import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { contractor_id, name, contact_name, phone, trade, trades, bio, service_area, google_review_popup_dismissed } = await req.json()

    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const updates: Record<string, any> = { name, contact_name, phone, trade, trades, bio }
    if (service_area !== undefined) updates.service_area = service_area
    if (google_review_popup_dismissed !== undefined) updates.google_review_popup_dismissed = google_review_popup_dismissed

    const { data, error } = await supabase
      .from('contractors')
      .update(updates)
      .eq('id', contractor_id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, contractor: data }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

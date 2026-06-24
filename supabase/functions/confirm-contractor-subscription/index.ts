import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { session_id, email: clientEmail } = await req.json()

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id is required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Payment not completed.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updatePayload = {
      status: 'active',
      stripe_customer_id: session.customer as string | null,
      stripe_subscription_id: session.subscription as string | null,
    }

    // Collect all candidate emails to try
    const sessionEmail = session.customer_details?.email || (session.metadata as Record<string, string> | null)?.email || ''
    const candidates = [...new Set(
      [clientEmail, sessionEmail].filter(Boolean).map(e => e.toLowerCase().trim())
    )]

    console.log(`[confirm-contractor-subscription] session=${session_id} candidates=${JSON.stringify(candidates)}`)

    // SELECT first, then UPDATE — more reliable than checking update row count
    let contractor: { id: string } | null = null

    for (const email of candidates) {
      const { data } = await supabase
        .from('contractors')
        .select('id')
        .eq('contact_email', email)
        .maybeSingle()
      if (data) { contractor = data; console.log(`[confirm-contractor-subscription] matched by email "${email}"`); break }
    }

    // Fall back: match by company name in Stripe metadata
    if (!contractor) {
      const companyName = (session.metadata as Record<string, string> | null)?.company_name
      if (companyName) {
        const { data } = await supabase
          .from('contractors')
          .select('id')
          .ilike('name', companyName.trim())
          .maybeSingle()
        if (data) { contractor = data; console.log(`[confirm-contractor-subscription] matched by company name "${companyName}"`) }
      }
    }

    if (!contractor) {
      console.error(`[confirm-contractor-subscription] no contractor found for candidates=${JSON.stringify(candidates)}`)
      return new Response(JSON.stringify({ error: `No contractor found. Candidates tried: ${candidates.join(', ')}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabase
      .from('contractors')
      .update(updatePayload)
      .eq('id', contractor.id)

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

    console.log(`[confirm-contractor-subscription] activated contractor id=${contractor.id}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[confirm-contractor-subscription] error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

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

    // Resolve email: prefer client-provided (signed-in user), fall back to Stripe session
    const sessionEmail = session.customer_details?.email
      || (session.metadata as Record<string, string> | null)?.email
      || ''
    const email = clientEmail?.toLowerCase().trim() || sessionEmail?.toLowerCase().trim()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Could not determine contractor email from session.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[confirm-contractor-subscription] session ${session_id}, resolving email: client="${clientEmail}" session="${sessionEmail}" using="${email}"`)

    const updatePayload = {
      status: 'active',
      stripe_customer_id: session.customer as string | null,
      stripe_subscription_id: session.subscription as string | null,
    }

    // 1) Match by client-provided email
    let matched = false
    if (clientEmail?.trim()) {
      const { error, count } = await supabase
        .from('contractors')
        .update(updatePayload)
        .eq('contact_email', clientEmail.toLowerCase().trim())
        .select('id', { count: 'exact', head: true })
      if (error) throw new Error(`DB update failed: ${error.message}`)
      if (count && count > 0) matched = true
    }

    // 2) Match by session email (covers contractors who paid without being signed in)
    if (!matched && sessionEmail) {
      const { error, count } = await supabase
        .from('contractors')
        .update(updatePayload)
        .eq('contact_email', sessionEmail.toLowerCase().trim())
        .select('id', { count: 'exact', head: true })
      if (error) throw new Error(`DB update failed (session email): ${error.message}`)
      if (count && count > 0) { matched = true; console.log(`[confirm-contractor-subscription] matched by session email "${sessionEmail}"`) }
    }

    // 3) Match by company name in Stripe metadata
    if (!matched) {
      const companyName = (session.metadata as Record<string, string> | null)?.company_name
      if (companyName) {
        const { error, count } = await supabase
          .from('contractors')
          .update(updatePayload)
          .ilike('name', companyName.trim())
          .select('id', { count: 'exact', head: true })
        if (error) throw new Error(`DB update failed (company name): ${error.message}`)
        if (count && count > 0) { matched = true; console.log(`[confirm-contractor-subscription] matched by company name "${companyName}"`) }
      }
    }

    if (!matched) {
      throw new Error(`No contractor found for email "${email}"${sessionEmail !== email ? ` or session email "${sessionEmail}"` : ''}`)
    }

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

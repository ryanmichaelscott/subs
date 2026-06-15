import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TiRQBAYDs9oVarW14DBq2HL': 'Member+',
  'price_1TiRQZAYDs9oVarWcZ10xjDG': 'Elite',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { checkout_session_id, clerk_user_id } = await req.json()

    if (!checkout_session_id || !clerk_user_id) {
      return new Response(JSON.stringify({ error: 'checkout_session_id and clerk_user_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!

    // Fetch the Stripe session with subscription expanded
    const sessionRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${checkout_session_id}?expand[]=subscription`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } },
    )
    const session = await sessionRes.json()

    if (!sessionRes.ok) {
      console.error('Stripe session fetch failed:', session)
      return new Response(JSON.stringify({ error: 'Failed to verify checkout session' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (session.status !== 'complete') {
      return new Response(JSON.stringify({ error: `Session not complete (status: ${session.status})` }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Security: verify the session was created for this user
    if (session.metadata?.clerk_user_id !== clerk_user_id) {
      return new Response(JSON.stringify({ error: 'Session does not belong to this user' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

    const customerId = session.customer
    const priceId = session.subscription?.items?.data?.[0]?.price?.id
    const tier = PRICE_TO_TIER[priceId] || 'Member'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await supabase
      .from('members')
      .select('*')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    let member
    if (existing) {
      const { data } = await supabase
        .from('members')
        .update({ tier, status: 'Active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId })
        .eq('clerk_user_id', clerk_user_id)
        .select()
        .single()
      member = data || existing
    } else {
      const sessionEmail = session.customer_details?.email || session.customer_email || ''
      const { data } = await supabase
        .from('members')
        .insert({
          clerk_user_id,
          email: sessionEmail,
          tier,
          status: 'Active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .select()
        .single()
      member = data
    }

    return new Response(JSON.stringify({ member }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('activate-membership error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

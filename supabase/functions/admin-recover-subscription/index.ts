import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!

    // Find Stripe customer(s) by email
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } },
    )
    const custData = await custRes.json()

    if (!custData.data?.length) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found for this email' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Try each customer to find one with an active subscription
    let subscription = null
    let customer = null

    for (const cust of custData.data) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${cust.id}&limit=5&expand[]=data.items.data.price`,
        { headers: { 'Authorization': `Bearer ${stripeKey}` } },
      )
      const subData = await subRes.json()
      const active = subData.data?.find((s: any) => s.status === 'active' || s.status === 'trialing')
      if (active) {
        subscription = active
        customer = cust
        break
      }
      // Fall back to most recent even if not active
      if (!subscription && subData.data?.length) {
        subscription = subData.data[0]
        customer = cust
      }
    }

    if (!subscription) {
      return new Response(JSON.stringify({ error: 'No subscription found for this email' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const clerk_user_id = subscription.metadata?.clerk_user_id
    if (!clerk_user_id) {
      return new Response(JSON.stringify({
        error: 'No clerk_user_id in subscription metadata. Cannot automatically link.',
        subscription_id: subscription.id,
        customer_id: customer.id,
      }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const priceId = subscription.items?.data?.[0]?.price?.id
    const tier = PRICE_TO_TIER[priceId] || 'Member'
    const status = subscription.status === 'active' ? 'Active' : subscription.status === 'trialing' ? 'Trial' : 'Active'

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
        .update({
          tier,
          status,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          email: existing.email || email,
        })
        .eq('clerk_user_id', clerk_user_id)
        .select()
        .single()
      member = data || existing
    } else {
      const { data } = await supabase
        .from('members')
        .insert({
          clerk_user_id,
          email,
          tier,
          status,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
        })
        .select()
        .single()
      member = data
    }

    return new Response(JSON.stringify({
      success: true,
      member,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      tier,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('admin-recover-subscription error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

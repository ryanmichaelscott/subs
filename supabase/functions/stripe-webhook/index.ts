import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1 = parts.find(p => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !v1) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === v1
}

function tierFromSubscription(subscription: any): string | null {
  const priceId = subscription?.items?.data?.[0]?.price?.id
  return priceId ? (PRICE_TO_TIER[priceId] || null) : null
}

serve(async (req) => {
  const payload = await req.text()
  const sigHeader = req.headers.get('stripe-signature') || ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (webhookSecret) {
    const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const event = JSON.parse(payload)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const clerkUserId = session.metadata?.clerk_user_id
    const customerId = session.customer
    const subscriptionId = session.subscription

    if (!clerkUserId) {
      console.error('No clerk_user_id in session metadata')
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    // Fetch subscription to get the price/tier
    let tier = 'Member'
    if (subscriptionId) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const sub = await subRes.json()
      tier = tierFromSubscription(sub) || 'Member'
    }

    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (existingMember) {
      await supabase
        .from('members')
        .update({ tier, status: 'Active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId })
        .eq('clerk_user_id', clerkUserId)
    } else {
      const sessionEmail = session.customer_details?.email || session.customer_email || ''
      await supabase
        .from('members')
        .insert({ clerk_user_id: clerkUserId, email: sessionEmail, tier, status: 'Active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId })
    }
  }

  else if (event.type === 'checkout.session.expired') {
    const session = event.data.object
    const email = session.customer_details?.email || session.customer_email || ''
    const name = session.customer_details?.name || ''
    const clerkUserId = session.metadata?.clerk_user_id || null

    if (email) {
      await supabase.from('abandoned_checkouts').upsert({
        session_id: session.id,
        email,
        name,
        clerk_user_id: clerkUserId,
        expired_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
    }
  }

  else if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object
    const clerkUserId = sub.metadata?.clerk_user_id
    const customerId = sub.customer
    const tier = tierFromSubscription(sub)
    const status = sub.status === 'active' ? 'Active' : sub.status === 'trialing' ? 'Trial' : 'Churned'

    const filter = clerkUserId
      ? supabase.from('members').update({ tier: tier || 'Member', status }).eq('clerk_user_id', clerkUserId)
      : supabase.from('members').update({ tier: tier || 'Member', status }).eq('stripe_customer_id', customerId)

    await filter
  }

  else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const clerkUserId = sub.metadata?.clerk_user_id
    const customerId = sub.customer

    const filter = clerkUserId
      ? supabase.from('members').update({ status: 'Churned' }).eq('clerk_user_id', clerkUserId)
      : supabase.from('members').update({ status: 'Churned' }).eq('stripe_customer_id', customerId)

    await filter
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

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

    const sessionEmail = session.customer_details?.email || session.customer_email || ''
    const sessionName = session.customer_details?.name || ''
    // ACH/bank payments complete the session but payment_status is 'unpaid' until the bank transfer clears.
    // Card payments are 'paid' immediately.
    const isPaid = session.payment_status === 'paid'

    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (existingMember) {
      const updates: Record<string, any> = { tier, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId }
      if (isPaid) updates.status = 'Active'
      await supabase.from('members').update(updates).eq('clerk_user_id', clerkUserId)
    } else {
      await supabase
        .from('members')
        .insert({ clerk_user_id: clerkUserId, email: sessionEmail, tier, status: isPaid ? 'Active' : 'Trial', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId })
    }

    // Notify admin always — non-critical
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'member', name: sessionName, email: sessionEmail, tier }),
      })
    } catch (e) { console.error('Admin notify error:', e) }

    // PassKit and welcome email only fire when payment is confirmed.
    // ACH payments will trigger these via invoice.payment_succeeded once the transfer clears.
    if (isPaid) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-passkit-pass`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clerk_user_id: clerkUserId, name: sessionName, email: sessionEmail, tier }),
        })
      } catch (e) { console.error('PassKit pass error:', e) }

      try {
        const firstName = sessionName?.split(' ')[0] || 'there'
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: sessionEmail, name: firstName }),
        })
      } catch (e) { console.error('Welcome email error:', e) }
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

    // Ignore trialing/incomplete — checkout.session.completed already sets Active.
    // We only act on active (trial→paid conversion) and hard cancellations.
    const status = sub.status === 'active' ? 'Active'
      : (sub.status === 'canceled' || sub.status === 'unpaid') ? 'Churned'
      : null

    if (status === null) {
      console.log(`[stripe-webhook] subscription.updated: ignoring status="${sub.status}"`)
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    const filter = clerkUserId
      ? supabase.from('members').update({ tier: tier || 'Member', status }).eq('clerk_user_id', clerkUserId)
      : supabase.from('members').update({ tier: tier || 'Member', status }).eq('stripe_customer_id', customerId)

    await filter
  }

  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object

    // Only handle the first invoice for a new subscription; ignore renewals
    if (invoice.billing_reason !== 'subscription_create') {
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    const subscriptionId = invoice.subscription
    const customerId = invoice.customer
    const invoiceEmail = invoice.customer_email || ''
    const invoiceName = invoice.customer_name || ''

    // Look up member by subscription ID (saved during checkout.session.completed for pending ACH)
    let memberRow: any = null
    if (subscriptionId) {
      const { data } = await supabase.from('members').select('id, status, tier, clerk_user_id').eq('stripe_subscription_id', subscriptionId).single()
      memberRow = data
    }
    if (!memberRow && customerId) {
      const { data } = await supabase.from('members').select('id, status, tier, clerk_user_id').eq('stripe_customer_id', customerId).single()
      memberRow = data
    }

    if (!memberRow) {
      console.error('invoice.payment_succeeded: no member found — subscription:', subscriptionId, 'customer:', customerId)
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    // Skip if already Active — card payment was handled immediately via checkout.session.completed
    if (memberRow.status === 'Active') {
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    // Get the definitive tier from the subscription
    let tier = memberRow.tier || 'Member'
    if (subscriptionId) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const sub = await subRes.json()
      tier = tierFromSubscription(sub) || tier
    }

    // Activate member
    await supabase.from('members').update({ status: 'Active', tier, stripe_customer_id: customerId }).eq('id', memberRow.id)

    // Notify admin — non-critical
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'member', name: invoiceName, email: invoiceEmail, tier }),
      })
    } catch (e) { console.error('Admin notify error:', e) }

    // Generate PassKit digital card — non-critical
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-passkit-pass`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clerk_user_id: memberRow.clerk_user_id, name: invoiceName, email: invoiceEmail, tier }),
      })
    } catch (e) { console.error('PassKit pass error:', e) }

    // Send welcome email — non-critical
    try {
      const firstName = invoiceName?.split(' ')[0] || 'there'
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: invoiceEmail, name: firstName }),
      })
    } catch (e) { console.error('Welcome email error:', e) }
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

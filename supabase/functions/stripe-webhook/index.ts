import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Price → tier mapping (legacy flow: clerk_user_id in session metadata) ────
const PRICE_TO_TIER: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

// ── Plan name → tier (new Stripe-first flow: plan in session metadata) ───────
const PLAN_TO_TIER: Record<string, string> = {
  'member':       'Member',
  'member-plus':  'Member+',
  'plus':         'Member+',
  'elite':        'Elite',
}

// ── Stripe webhook signature verification ────────────────────────────────────
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts     = sigHeader.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1        = parts.find(p => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !v1) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === v1
}

function tierFromSubscription(subscription: any): string | null {
  const priceId = subscription?.items?.data?.[0]?.price?.id
  return priceId ? (PRICE_TO_TIER[priceId] || null) : null
}

// ── Clerk: find or create user by email ──────────────────────────────────────
async function findOrCreateClerkUser(clerkKey: string, email: string, firstName: string, lastName: string, tier: string): Promise<string | null> {
  // Try to create
  const createRes = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_address: [email],
      first_name: firstName || '',
      last_name: lastName || '',
      skip_password_requirement: true,
      skip_password_checks: true,
      public_metadata: { role: 'member', tier },
    }),
  })
  const createData = await createRes.json()

  if (createRes.ok) {
    console.log('[clerk] created user:', createData.id)
    return createData.id
  }

  // Email already taken — look up existing user
  const isEmailTaken = (createData?.errors || []).some((e: any) =>
    e.code === 'form_identifier_exists' || (e.long_message || e.message || '').toLowerCase().includes('taken')
  )

  if (isEmailTaken) {
    const lookupRes = await fetch(
      `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(email)}`,
      { headers: { 'Authorization': `Bearer ${clerkKey}` } }
    )
    const users = await lookupRes.json()
    const existing = Array.isArray(users) ? users[0] : null
    if (existing) {
      console.log('[clerk] found existing user:', existing.id)
      // Never downgrade admin/staff roles — only set member role for non-privileged accounts
      const existingRole = existing.public_metadata?.role
      const safeRole = (existingRole === 'admin' || existingRole === 'staff') ? existingRole : 'member'
      if (existing.public_metadata?.tier !== tier || existing.public_metadata?.role !== safeRole) {
        await fetch(`https://api.clerk.com/v1/users/${existing.id}/metadata`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_metadata: { ...existing.public_metadata, role: safeRole, tier } }),
        })
      }
      return existing.id
    }
  }

  console.error('[clerk] user creation failed:', JSON.stringify(createData))
  return null
}

// ── Clerk: create sign-in token (magic link) ─────────────────────────────────
async function createSignInToken(clerkKey: string, clerkUserId: string): Promise<string | null> {
  const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: clerkUserId, expires_in_seconds: 86400 }),
  })
  if (!res.ok) {
    console.error('[clerk] sign_in_token error:', await res.text())
    return null
  }
  const data = await res.json()
  return data.token || null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || '').trim().split(/\s+/)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' }
}

serve(async (req) => {
  const payload   = await req.text()
  const sigHeader = req.headers.get('stripe-signature') || ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (webhookSecret) {
    const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
  }

  const event     = JSON.parse(payload)
  const supabase  = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const clerkKey  = Deno.env.get('CLERK_SECRET_KEY') || ''
  console.log('[webhook] CLERK_SECRET_KEY prefix:', clerkKey ? clerkKey.slice(0, 10) + '...' : 'NOT SET')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // ── Idempotency: log event, skip if already processed ──────────────────────
  if (event.id) {
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, processed')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent?.processed) {
      console.log(`[webhook] already processed event ${event.id}, skipping`)
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (!existingEvent) {
      await supabase.from('webhook_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event,
        processed: false,
      })
    }
  }

  const markProcessed = async (error?: string) => {
    if (!event.id) return
    await supabase.from('webhook_events').update({
      processed: !error,
      error: error || null,
    }).eq('stripe_event_id', event.id)
  }

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session        = event.data.object
    const customerId     = session.customer
    const subscriptionId = session.subscription
    const sessionEmail   = session.customer_details?.email || session.customer_email || ''
    const sessionName    = session.customer_details?.name || ''
    const isPaid         = session.payment_status === 'paid'

    // Plan from metadata (new Stripe-first flow) or fall back to subscription price lookup
    const metaPlan = session.metadata?.plan || ''
    let tier = PLAN_TO_TIER[metaPlan] || null

    if (!tier && subscriptionId) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const sub = await subRes.json()
      tier = tierFromSubscription(sub) || 'Member'
    }
    if (!tier) tier = 'Member'

    // ── Clerk: find or create user ──────────────────────────────────────────
    // Legacy flow: clerk_user_id was in session metadata (user logged in first)
    // New flow: no clerk_user_id — create from Stripe email
    let clerkUserId = session.metadata?.clerk_user_id || null

    if (!clerkUserId && sessionEmail && clerkKey) {
      const { firstName, lastName } = parseName(sessionName)
      clerkUserId = await findOrCreateClerkUser(clerkKey, sessionEmail, firstName, lastName, tier)
    }

    if (!clerkUserId) {
      console.error('[webhook] no clerk_user_id available for', sessionEmail)
    }

    // ── Upsert Supabase member record ────────────────────────────────────────
    const memberStatus = isPaid ? 'Active' : 'pending_payment'

    const { data: existingMember } = await supabase
      .from('members')
      .select('id, status')
      .or(
        clerkUserId
          ? `clerk_user_id.eq.${clerkUserId},stripe_customer_id.eq.${customerId}`
          : `stripe_customer_id.eq.${customerId}`
      )
      .limit(1)
      .maybeSingle()

    if (existingMember) {
      const updates: Record<string, any> = {
        tier,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      }
      if (clerkUserId) updates.clerk_user_id = clerkUserId
      if (isPaid || existingMember.status !== 'Active') updates.status = memberStatus
      await supabase.from('members').update(updates).eq('id', existingMember.id)
    } else {
      // Always insert the member record — even if Clerk failed, so payment is tracked
      const insert: Record<string, any> = {
        email: sessionEmail,
        name: sessionName,
        tier,
        status: memberStatus,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      }
      if (clerkUserId) insert.clerk_user_id = clerkUserId
      const { error: insertErr } = await supabase.from('members').insert(insert)
      if (insertErr) console.error('[webhook] member insert error:', insertErr.message)
    }

    // ── Notify admin (always) ────────────────────────────────────────────────
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'member', name: sessionName, email: sessionEmail, tier }),
      })
    } catch (e) { console.error('[webhook] admin notify error:', e) }

    if (isPaid) {
      // ── Generate sign-in token (magic link) for welcome email ──────────────
      let magicLink = 'https://subs.app/login'
      if (clerkUserId && clerkKey) {
        const token = await createSignInToken(clerkKey, clerkUserId)
        if (token) magicLink = `https://subs.app/welcome?ticket=${token}`
      }

      // ── Welcome email via Resend ───────────────────────────────────────────
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: sessionEmail,
            name: sessionName,
            tier,
            magic_link: magicLink,
          }),
        })
      } catch (e) { console.error('[webhook] welcome email error:', e) }

      // ── PassKit digital card ───────────────────────────────────────────────
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/create-passkit-pass`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_user_id: clerkUserId, name: sessionName, email: sessionEmail, tier }),
        })
      } catch (e) { console.error('[webhook] passkit error:', e) }
    } else {
      // ACH pending — send processing email
      try {
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey && sessionEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'SUBS <hello@subs.app>',
              to: sessionEmail,
              subject: 'SUBS membership — payment processing',
              html: `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;background:#f5f5f5;padding:40px 20px;margin:0;"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:40px 36px;"><div style="font-size:22px;font-weight:800;letter-spacing:0.06em;color:#1a1a1a;margin-bottom:28px;">SUBS.</div><p style="font-size:17px;font-weight:700;color:#1a1a1a;margin:0 0 12px;">Your membership is being processed.</p><p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 16px;">Bank account payments typically clear in <strong>3–5 business days</strong>. Once your payment clears, you'll receive your access link and your membership will be fully active.</p><p style="font-size:15px;color:#555;line-height:1.6;">Questions? Call or text <a href="tel:18884543019" style="color:#1a1a1a;font-weight:600;">1-888-454-3019</a> — we respond fast.</p><p style="font-size:13px;color:#aaa;margin-top:32px;">— The SUBS Team</p></div></body></html>`,
            }),
          })
        }
      } catch (e) { console.error('[webhook] ACH processing email error:', e) }
    }

    await markProcessed()
  }

  // ── checkout.session.expired ───────────────────────────────────────────────
  else if (event.type === 'checkout.session.expired') {
    const session     = event.data.object
    const email       = session.customer_details?.email || session.customer_email || ''
    const name        = session.customer_details?.name || ''
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
    await markProcessed()
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  else if (event.type === 'customer.subscription.updated') {
    const sub         = event.data.object
    const clerkUserId = sub.metadata?.clerk_user_id
    const customerId  = sub.customer
    const tier        = tierFromSubscription(sub)

    const status = sub.status === 'active' ? 'Active'
      : (sub.status === 'canceled' || sub.status === 'unpaid') ? 'Churned'
      : null

    if (status === null) {
      console.log(`[webhook] subscription.updated: ignoring status="${sub.status}"`)
      await markProcessed()
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const filter = clerkUserId
      ? supabase.from('members').update({ tier: tier || 'Member', status }).eq('clerk_user_id', clerkUserId)
      : supabase.from('members').update({ tier: tier || 'Member', status }).eq('stripe_customer_id', customerId)

    await filter
    await markProcessed()
  }

  // ── invoice.payment_succeeded (ACH bank transfers) ─────────────────────────
  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object

    // Only handle the first invoice for a new subscription; skip renewals
    if (invoice.billing_reason !== 'subscription_create') {
      await markProcessed()
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const subscriptionId = invoice.subscription
    const customerId     = invoice.customer
    const invoiceEmail   = invoice.customer_email || ''
    const invoiceName    = invoice.customer_name || ''

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
      console.error('[webhook] invoice.payment_succeeded: no member found — sub:', subscriptionId, 'customer:', customerId)
      await markProcessed('member not found')
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (memberRow.status === 'Active') {
      console.log('[webhook] invoice.payment_succeeded: member already active, skipping')
      await markProcessed()
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    let tier = memberRow.tier || 'Member'
    if (subscriptionId) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const sub = await subRes.json()
      tier = tierFromSubscription(sub) || tier
    }

    await supabase.from('members').update({ status: 'Active', tier, stripe_customer_id: customerId }).eq('id', memberRow.id)

    // Notify admin
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'member', name: invoiceName, email: invoiceEmail, tier }),
      })
    } catch (e) { console.error('[webhook] admin notify error:', e) }

    // Generate sign-in token
    let magicLink = 'https://subs.app/login'
    if (memberRow.clerk_user_id && clerkKey) {
      const token = await createSignInToken(clerkKey, memberRow.clerk_user_id)
      if (token) magicLink = `https://subs.app/welcome?ticket=${token}`
    }

    // Welcome email
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invoiceEmail, name: invoiceName, tier, magic_link: magicLink }),
      })
    } catch (e) { console.error('[webhook] welcome email error:', e) }

    // PassKit
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/create-passkit-pass`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_user_id: memberRow.clerk_user_id, name: invoiceName, email: invoiceEmail, tier }),
      })
    } catch (e) { console.error('[webhook] passkit error:', e) }

    await markProcessed()
  }

  // ── customer.subscription.deleted ─────────────────────────────────────────
  else if (event.type === 'customer.subscription.deleted') {
    const sub         = event.data.object
    const clerkUserId = sub.metadata?.clerk_user_id
    const customerId  = sub.customer

    const filter = clerkUserId
      ? supabase.from('members').update({ status: 'Churned' }).eq('clerk_user_id', clerkUserId)
      : supabase.from('members').update({ status: 'Churned' }).eq('stripe_customer_id', customerId)

    await filter
    await markProcessed()
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

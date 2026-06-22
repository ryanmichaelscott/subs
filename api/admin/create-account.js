import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const MEMBER_PRICE_IDS = {
  member: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
  plus:   'price_1TjQ8TAYDs9oVarWqCQyxLM5',
  elite:  'price_1TjQ7DAYDs9oVarWbJONkQ1P',
}

const ENTERPRISE_PRICE_IDS = {
  portfolio:    process.env.STRIPE_ENTERPRISE_PORTFOLIO_PRICE_ID || 'price_1TkX1RAYDs9oVarWRPRsTDsU',
  professional: process.env.STRIPE_ENTERPRISE_PROFESSIONAL_PRICE_ID || 'price_1TkX1hAYDs9oVarWI99Q2FP4',
}

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://getsubs.co'

async function createClerkUser({ email, firstName, lastName, role }) {
  const clerkKey = process.env.CLERK_SECRET_KEY
  if (!clerkKey) throw new Error('CLERK_SECRET_KEY not configured')

  const nameParts = (firstName || '').trim().split(' ')
  const first = nameParts[0] || ''
  const last = lastName || nameParts.slice(1).join(' ') || ''

  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      first_name: first,
      last_name: last,
      public_metadata: { role, admin_created: true },
      skip_password_checks: true,
      skip_password_requirement: true,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.errors?.[0]?.long_message || data?.errors?.[0]?.message || JSON.stringify(data)
    throw new Error(`Clerk error: ${msg}`)
  }
  return data.id
}

async function sendEmail({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'SUBS <hello@subs.app>', to, subject, html }),
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { type, send_email = false, ...fields } = req.body || {}
    if (!type) return res.status(400).json({ error: 'type is required' })

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const stripeKey   = process.env.STRIPE_SECRET_KEY

    const supabase = createClient(supabaseUrl, supabaseKey)
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2023-10-16' }) : null

    // ── HOMEOWNER (Member) ──────────────────────────────────────────────────
    if (type === 'member') {
      const { full_name, email, phone, tier } = fields
      if (!full_name || !email || !tier) return res.status(400).json({ error: 'full_name, email, tier required' })

      const priceId = MEMBER_PRICE_IDS[tier]
      if (!priceId) return res.status(400).json({ error: `Unknown tier: ${tier}` })

      const clerkUserId = await createClerkUser({ email, firstName: full_name, role: 'member' })

      const { data: member } = await supabase.from('members').insert({
        clerk_user_id: clerkUserId,
        full_name,
        email,
        phone: phone || null,
        tier: tier === 'member' ? 'Member' : tier === 'plus' ? 'Member+' : 'Elite',
        status: 'pending',
        admin_created: true,
        joined_at: new Date().toISOString(),
      }).select().single()

      let checkoutUrl = null
      if (stripe) {
        const customer = await stripe.customers.create({ email, name: full_name, metadata: { clerk_user_id: clerkUserId } })

        await supabase.from('members').update({ stripe_customer_id: customer.id }).eq('clerk_user_id', clerkUserId)

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${BASE_URL}/dashboard`,
          cancel_url: `${BASE_URL}/signup`,
          metadata: { clerk_user_id: clerkUserId, admin_created: 'true' },
        })
        checkoutUrl = session.url

        const tierLabel = tier === 'member' ? 'Member ($99/yr)' : tier === 'plus' ? 'Member+ ($179/yr)' : 'Elite ($349/yr)'
        if (send_email) {
          await sendEmail({
            to: email,
            subject: 'Your SUBS membership — complete your setup',
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0C0F0A;color:#F0EEE8;padding:32px;border-radius:12px">
              <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:4px">SUBS</div>
              <h2 style="font-size:20px;margin:16px 0 8px">Hi ${full_name.split(' ')[0]}, you're almost in.</h2>
              <p style="color:#8A9088;font-size:14px;line-height:1.6">Your SUBS account has been created. Complete your ${tierLabel} membership by clicking below.</p>
              <a href="${checkoutUrl}" style="display:inline-block;margin-top:20px;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Complete Membership →</a>
              <p style="color:#8A9088;font-size:12px;margin-top:24px">Questions? Reply to this email or text us.</p>
            </div>`,
          })
        }
      }

      return res.status(200).json({ success: true, clerk_user_id: clerkUserId, checkout_url: checkoutUrl, full_name, email, tier_label: tier === 'member' ? 'Member' : tier === 'plus' ? 'Member+' : 'Elite', message: `Member account created.` })
    }

    // ── CONTRACTOR ──────────────────────────────────────────────────────────
    if (type === 'contractor') {
      const { full_name, business_name, email, phone, trade, service_city, service_state } = fields
      if (!full_name || !email) return res.status(400).json({ error: 'full_name and email required' })

      const clerkUserId = await createClerkUser({ email, firstName: full_name, role: 'contractor' })

      await supabase.from('contractors').insert({
        clerk_user_id: clerkUserId,
        name: full_name,
        business_name: business_name || null,
        email,
        phone: phone || null,
        trade: trade || null,
        service_area: service_city && service_state ? `${service_city}, ${service_state}` : (service_city || service_state || null),
        status: 'pending',
        admin_created: true,
        submitted_at: new Date().toISOString(),
      })

      await sendEmail({
        to: email,
        subject: 'Welcome to SUBS — complete your contractor profile',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0C0F0A;color:#F0EEE8;padding:32px;border-radius:12px">
          <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:4px">SUBS</div>
          <h2 style="font-size:20px;margin:16px 0 8px">Hi ${full_name.split(' ')[0]}, welcome aboard.</h2>
          <p style="color:#8A9088;font-size:14px;line-height:1.6">Your contractor account has been created. Complete your profile to start receiving job requests from SUBS members.</p>
          <a href="${BASE_URL}/contractor/apply" style="display:inline-block;margin-top:20px;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Complete Profile →</a>
          <p style="color:#8A9088;font-size:12px;margin-top:24px">Questions? Reply to this email or text us.</p>
        </div>`,
      })

      return res.status(200).json({ success: true, clerk_user_id: clerkUserId, message: `Contractor account created. Onboarding email sent to ${email}.` })
    }

    // ── PROPERTY MANAGER ────────────────────────────────────────────────────
    if (type === 'property_manager') {
      const { full_name, company_name, email, phone, unit_count, plan } = fields
      if (!full_name || !email || !plan) return res.status(400).json({ error: 'full_name, email, plan required' })

      const clerkUserId = await createClerkUser({ email, firstName: full_name, role: 'enterprise' })

      const { data: entMember } = await supabase.from('enterprise_members').insert({
        clerk_user_id: clerkUserId,
        contact_name: full_name,
        company_name: company_name || null,
        email,
        phone: phone || null,
        unit_count: unit_count ? parseInt(unit_count) : null,
        plan: plan === 'enterprise_custom' ? 'enterprise' : plan,
        status: plan === 'enterprise_custom' ? 'pending' : 'pending',
        admin_created: true,
        created_at: new Date().toISOString(),
      }).select().single()

      if (plan === 'enterprise_custom') {
        await sendEmail({
          to: 'support@subs.app',
          subject: `New Enterprise Inquiry — ${company_name || full_name} — ${unit_count || '?'} units`,
          html: `<div style="font-family:sans-serif;padding:24px"><h2>New Enterprise Account (Admin Created)</h2>
            <p><strong>Contact:</strong> ${full_name}</p>
            <p><strong>Company:</strong> ${company_name || '—'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || '—'}</p>
            <p><strong>Units:</strong> ${unit_count || '—'}</p>
            <p><strong>Plan:</strong> Enterprise Custom</p>
          </div>`,
        })

        return res.status(200).json({ success: true, clerk_user_id: clerkUserId, message: `Enterprise account created (pending). support@subs.app notified.` })
      }

      const priceId = ENTERPRISE_PRICE_IDS[plan]
      if (!priceId) return res.status(400).json({ error: `Unknown plan: ${plan}` })

      let checkoutUrl = null
      if (stripe) {
        const customer = await stripe.customers.create({ email, name: company_name || full_name, metadata: { clerk_user_id: clerkUserId, type: 'enterprise' } })

        await supabase.from('enterprise_members').update({ stripe_customer_id: customer.id }).eq('clerk_user_id', clerkUserId)

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${BASE_URL}/enterprise/onboarding?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${BASE_URL}/property-managers`,
          metadata: { clerk_user_id: clerkUserId, plan, admin_created: 'true' },
        })
        checkoutUrl = session.url

        const planLabel = plan === 'portfolio' ? 'Portfolio ($749/yr)' : 'Professional ($1,899/yr)'
        if (send_email) {
          await sendEmail({
            to: email,
            subject: 'Your SUBS Enterprise account — complete your setup',
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0C0F0A;color:#F0EEE8;padding:32px;border-radius:12px">
              <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:4px">SUBS</div>
              <h2 style="font-size:20px;margin:16px 0 8px">Hi ${full_name.split(' ')[0]}, welcome to SUBS Enterprise.</h2>
              <p style="color:#8A9088;font-size:14px;line-height:1.6">Your ${planLabel} account has been created. Complete setup by clicking below.</p>
              <a href="${checkoutUrl}" style="display:inline-block;margin-top:20px;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Complete Setup →</a>
            </div>`,
          })
        }
      }

      return res.status(200).json({ success: true, clerk_user_id: clerkUserId, checkout_url: checkoutUrl, full_name, email, message: `Property manager account created.` })
    }

    // ── ENTERPRISE CUSTOM ───────────────────────────────────────────────────
    if (type === 'enterprise_custom') {
      const { full_name, company_name, email, phone, unit_count, negotiated_price } = fields
      if (!full_name || !email || !negotiated_price) return res.status(400).json({ error: 'full_name, email, negotiated_price required' })

      const annualCents = Math.round(parseFloat(negotiated_price) * 100)
      if (isNaN(annualCents) || annualCents < 100) return res.status(400).json({ error: 'negotiated_price must be a positive number' })

      const clerkUserId = await createClerkUser({ email, firstName: full_name, role: 'enterprise' })

      const { data: entMember } = await supabase.from('enterprise_members').insert({
        clerk_user_id: clerkUserId,
        contact_name: full_name,
        company_name: company_name || null,
        email,
        phone: phone || null,
        unit_count: unit_count ? parseInt(unit_count) : null,
        plan: 'enterprise',
        status: 'active',
        admin_created: true,
        created_at: new Date().toISOString(),
      }).select().single()

      let subscriptionId = null
      if (stripe) {
        const customer = await stripe.customers.create({
          email,
          name: company_name || full_name,
          metadata: { clerk_user_id: clerkUserId, type: 'enterprise_custom' },
        })

        await supabase.from('enterprise_members').update({ stripe_customer_id: customer.id }).eq('clerk_user_id', clerkUserId)

        const customPrice = await stripe.prices.create({
          currency: 'usd',
          unit_amount: annualCents,
          recurring: { interval: 'year' },
          product_data: { name: `SUBS Enterprise — ${company_name || full_name}` },
        })

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: customPrice.id }],
          metadata: { clerk_user_id: clerkUserId, admin_created: 'true' },
        })
        subscriptionId = subscription.id

        await supabase.from('enterprise_members').update({ stripe_subscription_id: subscriptionId }).eq('clerk_user_id', clerkUserId)
      }

      await sendEmail({
        to: email,
        subject: 'Welcome to SUBS Enterprise',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0C0F0A;color:#F0EEE8;padding:32px;border-radius:12px">
          <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:4px">SUBS</div>
          <h2 style="font-size:20px;margin:16px 0 8px">Hi ${full_name.split(' ')[0]}, welcome to SUBS Enterprise.</h2>
          <p style="color:#8A9088;font-size:14px;line-height:1.6">Your enterprise account is active. Sign in at getsubs.co to get started.</p>
          <a href="${BASE_URL}/login" style="display:inline-block;margin-top:20px;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Sign In →</a>
        </div>`,
      })

      await sendEmail({
        to: 'ryan@skscott.com',
        subject: `Enterprise deal closed — ${company_name || full_name} — $${parseFloat(negotiated_price).toLocaleString()}/yr`,
        html: `<div style="font-family:sans-serif;padding:24px"><h2>Enterprise Custom Account Created</h2>
          <p><strong>Contact:</strong> ${full_name}</p>
          <p><strong>Company:</strong> ${company_name || '—'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || '—'}</p>
          <p><strong>Units:</strong> ${unit_count || '—'}</p>
          <p><strong>Annual Price:</strong> $${parseFloat(negotiated_price).toLocaleString()}</p>
          ${subscriptionId ? `<p><strong>Stripe Subscription:</strong> ${subscriptionId}</p>` : ''}
        </div>`,
      })

      return res.status(200).json({ success: true, clerk_user_id: clerkUserId, subscription_id: subscriptionId, message: `Enterprise account created and subscription started at $${parseFloat(negotiated_price).toLocaleString()}/yr.` })
    }

    return res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    console.error('[admin/create-account] error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}

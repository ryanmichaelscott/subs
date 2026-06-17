import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

// Get or create a coupon with a fixed ID so it's idempotent
async function ensureCoupon(stripe: Stripe, id: string, params: object) {
  try {
    return await stripe.coupons.retrieve(id)
  } catch (_e) {
    return await stripe.coupons.create({ id, ...params })
  }
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

    // Handle referral conversion reward (non-critical — failure does not break activation)
    try {
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, referrer_member_id')
        .eq('referred_clerk_user_id', clerk_user_id)
        .eq('status', 'pending')
        .single()

      if (referral) {
        await supabase.from('referrals')
          .update({ status: 'converted', converted_at: new Date().toISOString() })
          .eq('id', referral.id)

        const { count } = await supabase.from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_member_id', referral.referrer_member_id)
          .eq('status', 'converted')

        const { data: referrer } = await supabase
          .from('members')
          .select('stripe_subscription_id, email, name')
          .eq('id', referral.referrer_member_id)
          .single()

        // Apply Stripe coupon at milestones 1 and 3
        if ((count === 1 || count === 3) && referrer?.stripe_subscription_id) {
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
          const isFreeYear = count === 3

          await ensureCoupon(stripe, isFreeYear ? 'REFER3' : 'REFER1',
            isFreeYear
              ? { percent_off: 100, duration: 'once', name: 'SUBS Free Year – 3 Referrals' }
              : { amount_off: 2000, currency: 'usd', duration: 'once', name: 'SUBS $20 Off – Referral' }
          )

          await stripe.subscriptions.update(referrer.stripe_subscription_id, {
            coupon: isFreeYear ? 'REFER3' : 'REFER1',
          })

          await supabase.from('referrals')
            .update({ reward_applied: isFreeYear ? 'free_year' : 'discount_20' })
            .eq('id', referral.id)
        }

        // Email referrer on every conversion
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey && referrer?.email) {
          const firstName = referrer.name?.split(' ')[0] || 'there'
          const referredName = member?.name?.split(' ')[0] || 'Someone'
          const isFreeYear = count === 3
          const isFirstMilestone = count === 1

          const subject = isFreeYear
            ? `Your next year of SUBS is on us!`
            : isFirstMilestone
              ? `$20 off earned — ${referredName} just joined SUBS!`
              : `${referredName} just joined — ${count} of 3 referrals`

          const rewardMessage = isFreeYear
            ? `You've referred 3 paying members — your next renewal is completely free. The 100% discount has been applied automatically.`
            : isFirstMilestone
              ? `We've applied <strong style="color:#5DFF8A">$20 off</strong> your next renewal automatically. 2 more paying referrals = a free year.`
              : count === 2
                ? `1 more paying referral and your next renewal is <strong style="color:#5DFF8A">completely free</strong>.`
                : `Keep sharing your link — 1 paying referral = $20 off, 3 = a free year.`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'SUBS <noreply@subs.app>',
              to: referrer.email,
              subject,
              html: `
                <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0C0F0A;color:#F0EEE8">
                  <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:24px">SUBS</div>
                  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">
                    ${isFreeYear ? `Your next year is free, ${firstName}!` : `${referredName} just joined SUBS, ${firstName}!`}
                  </h2>
                  <p style="color:#8A9088;line-height:1.6;margin:0 0 20px">${rewardMessage}</p>
                  <div style="background:#141814;border:1px solid #252A23;border-radius:10px;padding:14px 18px;margin-bottom:24px">
                    <div style="font-size:12px;color:#8A9088;margin-bottom:6px">YOUR PROGRESS</div>
                    <div style="font-size:14px;color:#F0EEE8">${count} of 3 paying referrals${count >= 3 ? ' — 🎉 goal reached!' : ''}</div>
                  </div>
                  <a href="https://subs.app/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
                    View your referrals →
                  </a>
                </div>
              `,
            }),
          })
        }
      }
    } catch (refErr) {
      console.error('Referral reward error:', refErr)
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

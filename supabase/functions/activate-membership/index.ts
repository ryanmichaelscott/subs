import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

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

    // Handle referral conversion reward
    try {
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, referrer_id')
        .eq('referred_clerk_user_id', clerk_user_id)
        .eq('status', 'pending')
        .single()

      if (referral) {
        // Mark referral as converted
        await supabase.from('referrals')
          .update({ status: 'converted', converted_at: new Date().toISOString() })
          .eq('id', referral.id)

        // Count total conversions for referrer
        const { count } = await supabase.from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', referral.referrer_id)
          .eq('status', 'converted')

        // Apply Stripe coupon at milestones 1 and 3
        if (count === 1 || count === 3) {
          const { data: referrer } = await supabase
            .from('members')
            .select('stripe_subscription_id, email, name')
            .eq('id', referral.referrer_id)
            .single()

          if (referrer?.stripe_subscription_id) {
            const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
            const isFreeYear = count === 3

            const coupon = await stripe.coupons.create(isFreeYear
              ? { percent_off: 100, duration: 'once', name: 'SUBS Free Year – 3 Referrals' }
              : { amount_off: 2000, currency: 'usd', duration: 'once', name: 'SUBS $20 Off – 1 Referral' }
            )

            await stripe.subscriptions.update(referrer.stripe_subscription_id, { coupon: coupon.id })

            await supabase.from('referrals').update({
              reward_applied: isFreeYear ? 'free_year' : 'discount_20',
            }).eq('id', referral.id)

            // Email the referrer about their reward
            const resendKey = Deno.env.get('RESEND_API_KEY')
            if (resendKey && referrer.email) {
              const firstName = referrer.name?.split(' ')[0] || 'there'
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: 'SUBS <noreply@subsapp.com>',
                  to: referrer.email,
                  subject: isFreeYear ? '🎉 Your next year of SUBS is on us!' : '🎉 $20 off your next renewal — referral reward!',
                  html: `
                    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0C0F0A;color:#F0EEE8">
                      <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:24px">SUBS</div>
                      <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">
                        ${isFreeYear ? 'Your next year is free, ' : '$20 off your next renewal, '}${firstName}!
                      </h2>
                      <p style="color:#8A9088;line-height:1.6;margin:0 0 20px">
                        ${isFreeYear
                          ? `You've referred 3 paying members to SUBS — your reward is a completely free renewal. The 100% discount has been applied to your account automatically.`
                          : `One of your referrals just became a paying member. We've applied a $20 discount to your next renewal automatically — no action needed.`
                        }
                      </p>
                      <div style="background:#5DFF8A18;border:1px solid #5DFF8A44;border-radius:10px;padding:16px 20px;margin-bottom:24px">
                        <div style="font-size:13px;font-weight:700;color:#5DFF8A">${isFreeYear ? '100% OFF — FREE YEAR' : '$20 OFF NEXT RENEWAL'}</div>
                        <div style="font-size:12px;color:#8A9088;margin-top:4px">Applied automatically to your subscription</div>
                      </div>
                      <a href="https://www.subsapp.com/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
                        View your dashboard →
                      </a>
                    </div>
                  `,
                }),
              })
            }
          }
        }
      }
    } catch (refErr) {
      // Referral logic is non-critical — log but don't fail activation
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

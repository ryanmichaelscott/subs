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
    const { email, promo_code, success_url, cancel_url } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify contractor exists and is approved
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, name, status, referred_by_code')
      .eq('contact_email', email.toLowerCase().trim())
      .single()

    if (!contractor) {
      return new Response(JSON.stringify({ error: 'No contractor application found for this email.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['approved', 'docs_signed'].includes(contractor.status)) {
      return new Response(JSON.stringify({ error: 'Your application must be approved before subscribing.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve promo code if provided; fall back to the referral code captured
    // at application time (contractor-to-contractor referrals, 10% off)
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
    let referralCode: string | null = null

    const resolveReferrer = async (code: string) => {
      const { data } = await supabase
        .from('contractors')
        .select('id, referral_code, referral_promo_id')
        .eq('referral_code', code.toUpperCase().trim())
        .maybeSingle()
      // One level deep, no self-referral
      return data && data.id !== contractor.id ? data : null
    }

    if (promo_code?.trim()) {
      const promos = await stripe.promotionCodes.list({ code: promo_code.trim(), active: true, limit: 1 })
      if (promos.data.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid or expired promo code.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      discounts = [{ promotion_code: promos.data[0].id }]
      const referrer = await resolveReferrer(promo_code)
      if (referrer) referralCode = referrer.referral_code
    } else if (contractor.referred_by_code) {
      const referrer = await resolveReferrer(contractor.referred_by_code)
      if (referrer?.referral_promo_id) {
        discounts = [{ promotion_code: referrer.referral_promo_id }]
        referralCode = referrer.referral_code
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: 'price_1TicGZAYDs9oVarWmVWT27wz', quantity: 1 }],
      customer_email: email,
      success_url,
      cancel_url,
      metadata: {
        email,
        company_name: contractor.name,
        type: 'contractor_subscription',
        ...(referralCode ? { referral_code: referralCode } : {}),
      },
    }

    if (discounts) {
      sessionParams.discounts = discounts
    } else {
      sessionParams.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

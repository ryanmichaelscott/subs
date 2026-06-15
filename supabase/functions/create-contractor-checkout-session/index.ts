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
    const { company_name, trades, email, promo_code, success_url, cancel_url } = await req.json()

    if (!company_name || !email || !trades?.length) {
      return new Response(JSON.stringify({ error: 'company_name, trades, and email are required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Resolve promo code if provided
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
    if (promo_code?.trim()) {
      const promos = await stripe.promotionCodes.list({ code: promo_code.trim(), active: true, limit: 1 })
      if (promos.data.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid or expired promo code.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      discounts = [{ promotion_code: promos.data[0].id }]
    }

    const primaryTrade = trades[0]

    // Create contractor record with status pending before checkout
    await supabase.from('contractors').upsert({
      name: company_name,
      trade: primaryTrade,
      trades,
      contact_email: email,
      status: 'pending',
    }, { onConflict: 'contact_email' })

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: 'price_1TicGZAYDs9oVarWmVWT27wz', quantity: 1 }],
      customer_email: email,
      success_url,
      cancel_url,
      metadata: { email, company_name, trade: primaryTrade },
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

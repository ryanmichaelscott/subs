import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { price_id, clerk_user_id, email, success_url, cancel_url } = await req.json()

  if (!price_id || !clerk_user_id || !success_url || !cancel_url) {
    return new Response(JSON.stringify({ error: 'price_id, clerk_user_id, success_url, cancel_url are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Append with & if success_url already has query params, otherwise use ?
  const sessionSuccessUrl = success_url.includes('?')
    ? `${success_url}&checkout_session_id={CHECKOUT_SESSION_ID}`
    : `${success_url}?checkout_session_id={CHECKOUT_SESSION_ID}`

  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: sessionSuccessUrl,
    cancel_url,
    'line_items[0][price]': price_id,
    'line_items[0][quantity]': '1',
    // Embed clerk_user_id in both places so it's accessible in subscription events too
    'metadata[clerk_user_id]': clerk_user_id,
    'subscription_data[metadata][clerk_user_id]': clerk_user_id,
  })

  if (email) {
    params.set('customer_email', email)
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const session = await res.json()

  if (!res.ok) {
    return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

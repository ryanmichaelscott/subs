import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Overage payment: a member past their yearly request quota pays $25 for one
// additional request. Creates a one-time (payment-mode) Stripe Checkout
// session carrying the full request payload in metadata; when the session
// completes, stripe-webhook submits the request through create-lead with
// billed=true. The member never re-enters the form.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OVERAGE_PRICE_ID = 'price_1TtxCLAYDs9oVarWE1OMAF3E' // $25 one-time

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { clerk_user_id, email, trade, description, zip, state, preferred_date, member_name } = await req.json()
    if (!clerk_user_id || !email || !trade || !zip) {
      return new Response(JSON.stringify({ error: 'clerk_user_id, email, trade, zip required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'

    const params = new URLSearchParams({
      'mode': 'payment',
      'line_items[0][price]': OVERAGE_PRICE_ID,
      'line_items[0][quantity]': '1',
      'customer_email': email,
      'success_url': `${appUrl}/dashboard?extra_request=paid`,
      'cancel_url': `${appUrl}/dashboard`,
      'metadata[type]': 'extra_request',
      'metadata[clerk_user_id]': clerk_user_id,
      'metadata[member_email]': email,
      'metadata[member_name]': (member_name || '').slice(0, 400),
      'metadata[trade]': String(trade).slice(0, 400),
      'metadata[description]': (description || '').slice(0, 450),
      'metadata[zip]': String(zip).slice(0, 20),
      'metadata[state]': (state || '').slice(0, 10),
      'metadata[preferred_date]': (preferred_date || '').slice(0, 40),
    })

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    const session = await res.json()
    if (session.error) throw new Error(session.error.message)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('pay-extra-request error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

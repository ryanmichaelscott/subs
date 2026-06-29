import Stripe from 'stripe'

const PRICE_IDS = {
  member:        'price_1TiRPcAYDs9oVarWLWpp0wLZ',
  'member-plus': 'price_1TjQ8TAYDs9oVarWqCQyxLM5',
  plus:          'price_1TjQ8TAYDs9oVarWqCQyxLM5',
  elite:         'price_1TjQ7DAYDs9oVarWbJONkQ1P',
}

const PROMO_CODES = {
  DOOR100: 'promo_1TnP7jAYDs9oVarWbKGY7Rr4',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const plan   = req.method === 'GET' ? req.query.plan   : (req.body?.plan   || req.query.plan)
  const coupon = req.method === 'GET' ? req.query.coupon : (req.body?.coupon || req.query.coupon)

  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    // Unknown plan — send home
    return res.status(302).setHeader('Location', '/').end()
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    if (req.method === 'GET') return res.redirect(302, '/')
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  const BASE = process.env.APP_URL || 'https://subs.app'

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const params = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${BASE}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: BASE,
    billing_address_collection: 'auto',
    metadata: { plan: plan || '', coupon: coupon || '' },
    subscription_data: { metadata: { plan: plan || '', coupon: coupon || '' } },
  }

  // DOOR100 is Elite-only — ignore coupon for other plans
  if (coupon && PROMO_CODES[coupon.toUpperCase()] && plan === 'elite') {
    params.discounts = [{ promotion_code: PROMO_CODES[coupon.toUpperCase()] }]
  }

  try {
    const session = await stripe.checkout.sessions.create(params)
    if (req.method === 'GET') return res.redirect(303, session.url)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Stripe error:', err)
    if (req.method === 'GET') return res.redirect(302, '/')
    return res.status(500).json({ error: err.message })
  }
}

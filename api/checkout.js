import Stripe from 'stripe'

// Two public plans only. Legacy Member+/Elite price IDs stay live in Stripe
// for existing subscribers but are not purchasable from the frontend.
const PRICE_IDS = {
  member: 'price_1TiRPcAYDs9oVarWLWpp0wLZ',
  full:   'price_1TtwA5AYDs9oVarWSOV7SwP7',
}

const PROMO_CODES = {
  DOOR100: 'promo_1TtwmjAYDs9oVarW7K7jt7Xq',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const plan   = req.method === 'GET' ? req.query.plan   : (req.body?.plan   || req.query.plan)
  const coupon = req.method === 'GET' ? req.query.coupon : (req.body?.coupon || req.query.coupon)
  const ref    = req.method === 'GET' ? req.query.ref    : (req.body?.ref    || req.query.ref)

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

  // DOOR100 is Full Pass-only — ignore coupon for other plans
  if (coupon && PROMO_CODES[coupon.toUpperCase()] && plan === 'full') {
    params.discounts = [{ promotion_code: PROMO_CODES[coupon.toUpperCase()] }]
  }

  // Contractor referral code — 10% off + commission attribution.
  // Explicit coupons take precedence; invalid codes are silently ignored.
  if (ref && !params.discounts) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && supabaseKey) {
        const code = String(ref).toUpperCase().trim()
        const lookup = await fetch(
          `${supabaseUrl}/rest/v1/contractors?referral_code=eq.${encodeURIComponent(code)}&select=id,referral_code,referral_promo_id&limit=1`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        )
        const rows = await lookup.json()
        const contractor = Array.isArray(rows) ? rows[0] : null
        if (contractor?.referral_promo_id) {
          params.discounts = [{ promotion_code: contractor.referral_promo_id }]
          params.metadata.referral_code = contractor.referral_code
          params.subscription_data.metadata.referral_code = contractor.referral_code
        }
      }
    } catch (e) {
      console.error('[checkout] referral lookup failed:', e.message)
    }
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

import Stripe from 'stripe'

const PRICE_IDS = {
  portfolio:    process.env.STRIPE_ENTERPRISE_PORTFOLIO_PRICE_ID    || 'price_1TkX1RAYDs9oVarWRPRsTDsU',
  professional: process.env.STRIPE_ENTERPRISE_PROFESSIONAL_PRICE_ID || 'price_1TkX1hAYDs9oVarWI99Q2FP4',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { plan, email } = req.body || {}
    if (!plan || !PRICE_IDS[plan]) {
      return res.status(400).json({ error: `Invalid or unconfigured plan: ${plan}. Set STRIPE_ENTERPRISE_PORTFOLIO_PRICE_ID and STRIPE_ENTERPRISE_PROFESSIONAL_PRICE_ID in Vercel.` })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://subs.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${baseUrl}/enterprise/onboarding?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/property-managers`,
      customer_email: email || undefined,
      metadata: { plan, product: 'enterprise' },
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[enterprise/checkout] error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}

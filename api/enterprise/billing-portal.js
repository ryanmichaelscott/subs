import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { clerk_user_id } = req.body || {}
    if (!clerk_user_id) return res.status(400).json({ error: 'clerk_user_id required' })

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const stripeKey   = process.env.STRIPE_SECRET_KEY

    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: member } = await supabase
      .from('enterprise_members')
      .select('stripe_customer_id')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (!member?.stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found for this account' })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: 'https://subs.app/enterprise/dashboard',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[enterprise/billing-portal] error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}

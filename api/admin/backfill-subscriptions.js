import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const PRICE_TO_TIER = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  if (req.method === 'GET') {
    // Return members who are Active but missing stripe_subscription_id
    const { data, error } = await supabase
      .from('members')
      .select('id, email, tier, stripe_customer_id, stripe_subscription_id')
      .eq('status', 'Active')
      .not('stripe_customer_id', 'is', null)
      .is('stripe_subscription_id', null)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ count: data.length, members: data })
  }

  if (req.method === 'POST') {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' })
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Find all Active members missing a subscription ID
    const { data: members, error: fetchError } = await supabase
      .from('members')
      .select('id, email, tier, stripe_customer_id, stripe_subscription_id')
      .eq('status', 'Active')
      .not('stripe_customer_id', 'is', null)
      .is('stripe_subscription_id', null)

    if (fetchError) return res.status(500).json({ error: fetchError.message })

    const results = []

    for (const member of members ?? []) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: member.stripe_customer_id,
          status: 'active',
          limit: 1,
          expand: ['data.items.data.price'],
        })

        if (subs.data.length === 0) {
          results.push({ email: member.email, status: 'no_active_sub_found', stripe_customer_id: member.stripe_customer_id })
          continue
        }

        const sub = subs.data[0]
        const priceId = sub.items.data[0]?.price?.id
        const tierFromPrice = priceId ? PRICE_TO_TIER[priceId] : null

        const update = {
          stripe_subscription_id: sub.id,
          ...(tierFromPrice ? { tier: tierFromPrice } : {}),
        }

        const { error: updateError } = await supabase
          .from('members')
          .update(update)
          .eq('id', member.id)

        if (updateError) {
          results.push({ email: member.email, status: 'update_failed', error: updateError.message })
        } else {
          results.push({
            email: member.email,
            status: 'backfilled',
            subscription_id: sub.id,
            tier: tierFromPrice || member.tier,
            price_id: priceId,
          })
        }
      } catch (err) {
        results.push({ email: member.email, status: 'error', error: err?.message })
      }
    }

    const backfilled = results.filter(r => r.status === 'backfilled').length
    const notFound   = results.filter(r => r.status === 'no_active_sub_found').length
    const errors     = results.filter(r => r.status === 'error' || r.status === 'update_failed').length

    return res.status(200).json({ success: true, processed: members.length, backfilled, not_found: notFound, errors, results })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

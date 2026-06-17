import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Known member price IDs → tier label
const MEMBER_PRICE_TIERS: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TiRQBAYDs9oVarW14DBq2HL': 'Member+',
  'price_1TiRQZAYDs9oVarWcZ10xjDG': 'Elite',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    let arrCents = 0
    let totalCount = 0
    const mrrByTierCents: Record<string, number> = { Member: 0, 'Member+': 0, Elite: 0, Contractor: 0 }
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price'],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const sub of page.data) {
        for (const item of sub.items.data) {
          const price = item.price as Stripe.Price
          const unitAmount = price.unit_amount ?? 0
          const quantity = item.quantity ?? 1
          const interval = price.recurring?.interval
          const intervalCount = price.recurring?.interval_count ?? 1

          // Annualize at full plan price — quantity * unit_amount, no coupon impact
          let annualCents = 0
          if (interval === 'month') {
            annualCents = (unitAmount * quantity / intervalCount) * 12
          } else if (interval === 'year') {
            annualCents = (unitAmount * quantity) / intervalCount
          } else {
            continue
          }

          arrCents += annualCents

          // Bucket by tier or contractor
          const tier = MEMBER_PRICE_TIERS[price.id]
          if (tier) {
            mrrByTierCents[tier] += annualCents / 12
          } else {
            mrrByTierCents['Contractor'] += annualCents / 12
          }
        }
        totalCount++
      }

      hasMore = page.has_more
      if (hasMore && page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id
      }
    }

    const mrrCents = Math.round(arrCents / 12)
    const mrrByTier: Record<string, number> = {}
    for (const [k, v] of Object.entries(mrrByTierCents)) {
      mrrByTier[k] = Math.round(v) / 100  // dollars, rounded to cent
    }

    return new Response(JSON.stringify({
      arr: Math.round(arrCents) / 100,
      mrr: mrrCents / 100,
      subscription_count: totalCount,
      mrr_by_tier: mrrByTier,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('get-stripe-revenue error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

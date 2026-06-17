import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    let arrCents = 0
    let mrrCents = 0
    let totalCount = 0
    let hasMore = true
    let startingAfter: string | undefined

    // Paginate through all active subscriptions
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
          const interval = price.recurring?.interval
          const intervalCount = price.recurring?.interval_count ?? 1

          // Annualize — use plan price (unit_amount), NOT what's actually charged
          // This means coupons/discounts do NOT affect ARR
          let annualCents = 0
          if (interval === 'month') {
            annualCents = (unitAmount / intervalCount) * 12
          } else if (interval === 'year') {
            annualCents = unitAmount / intervalCount
          } else {
            // Unknown interval — skip
            continue
          }

          arrCents += annualCents
        }
        totalCount++
      }

      hasMore = page.has_more
      if (hasMore && page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id
      }
    }

    mrrCents = Math.round(arrCents / 12)
    arrCents = Math.round(arrCents)

    return new Response(JSON.stringify({
      arr: arrCents / 100,
      mrr: mrrCents / 100,
      arr_cents: arrCents,
      mrr_cents: mrrCents,
      subscription_count: totalCount,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('get-stripe-revenue error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

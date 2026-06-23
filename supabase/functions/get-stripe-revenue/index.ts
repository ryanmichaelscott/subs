import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Known member price IDs → tier label
const MEMBER_PRICE_TIERS: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    // Build customer_id → tier fallback from Supabase so unknown price IDs still land in the right bucket
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: memberRows } = await supabase
      .from('members')
      .select('stripe_customer_id, tier')
      .not('stripe_customer_id', 'is', null)

    const customerTierMap: Record<string, string> = {}
    for (const m of memberRows ?? []) {
      if (m.stripe_customer_id && m.tier) customerTierMap[m.stripe_customer_id] = m.tier
    }

    let arrCents = 0
    let totalCount = 0
    const mrrByTierCents: Record<string, number> = { Member: 0, 'Member+': 0, Elite: 0, Contractor: 0 }
    const lines: { customer: string; label: string; price_id: string; unit_amount: number; interval: string; annual: number }[] = []
    const unknownPriceIds: Record<string, { unit_amount: number; count: number }> = {}
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price', 'data.customer'],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const sub of page.data) {
        const customerId = typeof sub.customer === 'object' && sub.customer !== null
          ? (sub.customer as Stripe.Customer).id
          : String(sub.customer)
        const customerEmail = typeof sub.customer === 'object' && sub.customer !== null
          ? (sub.customer as Stripe.Customer).email ?? customerId
          : customerId

        for (const item of sub.items.data) {
          const price = item.price as Stripe.Price
          const unitAmount = price.unit_amount ?? 0
          const quantity = item.quantity ?? 1
          const interval = price.recurring?.interval
          const intervalCount = price.recurring?.interval_count ?? 1

          let annualCents = 0
          if (interval === 'month') {
            annualCents = (unitAmount * quantity / intervalCount) * 12
          } else if (interval === 'year') {
            annualCents = (unitAmount * quantity) / intervalCount
          } else {
            continue
          }

          arrCents += annualCents

          // Tier resolution: 1) hardcoded price ID map, 2) Supabase customer→tier lookup, 3) Contractor
          let tier = MEMBER_PRICE_TIERS[price.id]
          if (!tier) {
            const supabaseTier = customerTierMap[customerId]
            if (supabaseTier) {
              tier = supabaseTier
              console.log(`[get-stripe-revenue] unknown price ${price.id} for customer ${customerId} → resolved tier "${tier}" from Supabase`)
            } else {
              if (!unknownPriceIds[price.id]) unknownPriceIds[price.id] = { unit_amount: unitAmount, count: 0 }
              unknownPriceIds[price.id].count++
              tier = 'Contractor'
            }
          }

          mrrByTierCents[tier] = (mrrByTierCents[tier] ?? 0) + annualCents / 12

          lines.push({
            customer: customerEmail,
            label: tier,
            price_id: price.id,
            unit_amount: unitAmount,
            interval: interval ? `${intervalCount > 1 ? intervalCount + 'x' : ''}${interval}` : '?',
            annual: Math.round(annualCents) / 100,
          })
        }
        totalCount++
      }

      hasMore = page.has_more
      if (hasMore && page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id
      }
    }

    if (Object.keys(unknownPriceIds).length > 0) {
      console.log('[get-stripe-revenue] unmapped price IDs (bucketed as Contractor):', JSON.stringify(unknownPriceIds))
    }

    const mrrCents = Math.round(arrCents / 12)
    const mrrByTier: Record<string, number> = {}
    for (const [k, v] of Object.entries(mrrByTierCents)) {
      mrrByTier[k] = Math.round(v) / 100
    }

    return new Response(JSON.stringify({
      arr: Math.round(arrCents) / 100,
      mrr: mrrCents / 100,
      subscription_count: totalCount,
      mrr_by_tier: mrrByTier,
      lines,
      unknown_price_ids: unknownPriceIds,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('get-stripe-revenue error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MEMBER_PRICE_IDS = new Set([
  'price_1TiRPcAYDs9oVarWLWpp0wLZ',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P',
])

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json().catch(() => ({}))
    const period: string = body.period ?? 'month'

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not set' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const now = new Date()

    // ── Date ranges ───────────────────────────────────────────────────────────
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

    if (period === 'week') {
      const dow = now.getDay() // 0=Sun
      const mondayOffset = dow === 0 ? 6 : dow - 1
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
      currentEnd = new Date(now)
      previousEnd = new Date(currentStart.getTime() - 1)
      previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate() - 6)
    } else if (period === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      currentEnd = new Date(now)
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    } else if (period === 'quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3
      currentStart = new Date(now.getFullYear(), qStartMonth, 1)
      currentEnd = new Date(now)
      previousStart = new Date(now.getFullYear(), qStartMonth - 3, 1)
      previousEnd = new Date(now.getFullYear(), qStartMonth, 0, 23, 59, 59)
    } else {
      // year
      currentStart = new Date(now.getFullYear(), 0, 1)
      currentEnd = new Date(now)
      previousStart = new Date(now.getFullYear() - 1, 0, 1)
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
    }

    // ── Bucket labels ─────────────────────────────────────────────────────────
    let labels: string[]
    if (period === 'week') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    } else if (period === 'month') {
      const cDays = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate()
      const pDays = new Date(previousStart.getFullYear(), previousStart.getMonth() + 1, 0).getDate()
      labels = Array.from({ length: Math.max(cDays, pDays) }, (_, i) => String(i + 1))
    } else if (period === 'quarter') {
      labels = Array.from({ length: 13 }, (_, i) => `W${i + 1}`)
    } else {
      labels = [...MONTH_NAMES]
    }

    // ── Init buckets ──────────────────────────────────────────────────────────
    type Bucket = { member: number; contractor: number }
    const cBuckets: Record<string, Bucket> = {}
    const pBuckets: Record<string, Bucket> = {}
    for (const l of labels) {
      cBuckets[l] = { member: 0, contractor: 0 }
      pBuckets[l] = { member: 0, contractor: 0 }
    }

    function getBucket(d: Date, periodStart: Date): string {
      if (period === 'week') return DAY_NAMES[d.getDay()]
      if (period === 'month') return String(d.getDate())
      if (period === 'quarter') {
        const week = Math.min(Math.floor((d.getTime() - periodStart.getTime()) / (7 * 86400000)) + 1, 13)
        return `W${week}`
      }
      return MONTH_NAMES[d.getMonth()]
    }

    // ── Fetch invoices ────────────────────────────────────────────────────────
    const winStartTs = Math.floor(previousStart.getTime() / 1000)
    const winEndTs = Math.floor(currentEnd.getTime() / 1000) + 1
    const cStartTs = Math.floor(currentStart.getTime() / 1000)
    const cEndTs = Math.floor(currentEnd.getTime() / 1000) + 1
    const pStartTs = Math.floor(previousStart.getTime() / 1000)
    const pEndTs = Math.floor(previousEnd.getTime() / 1000) + 1

    let hasMore = true
    let startingAfter: string | undefined
    let cTotalMember = 0, pTotalMember = 0, cTotalContractor = 0, pTotalContractor = 0

    while (hasMore) {
      const page = await stripe.invoices.list({
        status: 'paid',
        limit: 100,
        created: { gte: winStartTs, lte: winEndTs },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const inv of page.data) {
        if (!inv.amount_paid || inv.amount_paid <= 0) continue

        const ts = (inv.status_transitions?.paid_at ?? inv.created) as number

        // Determine member vs contractor by inspecting line item price IDs
        let isMember = false
        for (const line of (inv.lines?.data ?? [])) {
          const price = line.price
          const priceId = typeof price === 'string' ? price : price?.id
          if (priceId && MEMBER_PRICE_IDS.has(priceId)) {
            isMember = true
            break
          }
        }
        // Skip one-time charges that aren't subscriptions
        if (!isMember && !inv.subscription) continue

        const d = new Date(ts * 1000)
        const cents = inv.amount_paid

        if (ts >= cStartTs && ts <= cEndTs) {
          const bucket = getBucket(d, currentStart)
          if (cBuckets[bucket]) {
            if (isMember) { cBuckets[bucket].member += cents; cTotalMember += cents }
            else { cBuckets[bucket].contractor += cents; cTotalContractor += cents }
          }
        } else if (ts >= pStartTs && ts <= pEndTs) {
          const bucket = getBucket(d, previousStart)
          if (pBuckets[bucket]) {
            if (isMember) { pBuckets[bucket].member += cents; pTotalMember += cents }
            else { pBuckets[bucket].contractor += cents; pTotalContractor += cents }
          }
        }
      }

      hasMore = page.has_more
      startingAfter = hasMore ? page.data[page.data.length - 1].id : undefined
    }

    const points = labels.map(label => ({
      label,
      current: Math.round(cBuckets[label].member) / 100,
      previous: Math.round(pBuckets[label].member) / 100,
    }))

    const pctChange = pTotalMember > 0
      ? Math.round(((cTotalMember - pTotalMember) / pTotalMember) * 100)
      : cTotalMember > 0 ? 100 : 0

    return new Response(JSON.stringify({
      period,
      points,
      summary: {
        current_total: Math.round(cTotalMember) / 100,
        previous_total: Math.round(pTotalMember) / 100,
        pct_change: pctChange,
        contractor_current: Math.round(cTotalContractor) / 100,
        contractor_previous: Math.round(pTotalContractor) / 100,
      },
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('get-revenue-chart-data error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

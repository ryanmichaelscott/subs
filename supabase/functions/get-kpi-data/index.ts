import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = startOfThisMonth
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const startOfMonthTs = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)

    const [
      activeMembersRes,
      newThisMonthRes,
      newLastMonthRes,
      activeContractorsRes,
      allContractors6moRes,
      jobsThisMonthRes,
      jobsLastMonthRes,
      jobsLast30Res,
      leadsAcceptedRes,
      leadsTotalRes,
      referralsRes,
      referralSignupsThisMonthRes,
      newMembersThisMonthCountRes,
      waitlistRes,
      npsRes,
    ] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active').gte('joined_at', startOfThisMonth),
      supabase.from('members').select('id', { count: 'exact', head: true }).gte('joined_at', startOfLastMonth).lt('joined_at', endOfLastMonth),
      supabase.from('contractors').select('id, service_area').eq('status', 'active'),
      supabase.from('contractors').select('id, status').lt('submitted_at', sixMonthsAgo),
      supabase.from('job_requests').select('id', { count: 'exact', head: true }).gte('submitted_at', startOfThisMonth),
      supabase.from('job_requests').select('id', { count: 'exact', head: true }).gte('submitted_at', startOfLastMonth).lt('submitted_at', endOfLastMonth),
      supabase.from('job_requests').select('id', { count: 'exact', head: true }).gte('submitted_at', thirtyDaysAgo),
      supabase.from('lead_notifications').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'completed']),
      supabase.from('lead_notifications').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'declined', 'expired', 'completed']),
      supabase.from('referrals').select('status, referred_member_id, created_at'),
      supabase.from('referrals').select('id', { count: 'exact', head: true }).not('referred_member_id', 'is', null).gte('created_at', startOfThisMonth),
      supabase.from('members').select('id', { count: 'exact', head: true }).gte('joined_at', startOfThisMonth),
      supabase.from('waitlist').select('state'),
      supabase.from('nps_responses').select('score').gte('survey_date', ninetyDaysAgo).catch(() => ({ data: [] })),
    ])

    // Members
    const totalActive = activeMembersRes.count ?? 0
    const newThisMonth = newThisMonthRes.count ?? 0
    const newLastMonth = newLastMonthRes.count ?? 0
    const momGrowthPct = newLastMonth > 0
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : newThisMonth > 0 ? 100 : 0

    // Contractors
    const activeContractors = activeContractorsRes.data ?? []
    const totalActiveContractors = activeContractors.length
    const old = allContractors6moRes.data ?? []
    const retention6mo = old.length > 0
      ? Math.round((old.filter(c => c.status === 'active').length / old.length) * 100)
      : null

    // Active markets (distinct states from active contractor service areas)
    const activeStates = [...new Set(activeContractors.map(c => {
      try { return JSON.parse(c.service_area || '{}')?.state } catch { return null }
    }).filter(Boolean))].sort()

    // Waitlist by state
    const waitlistByState: Record<string, number> = {}
    for (const w of (waitlistRes.data ?? [])) {
      if (w.state) waitlistByState[w.state] = (waitlistByState[w.state] || 0) + 1
    }

    // Jobs
    const jobsThisMonth = jobsThisMonthRes.count ?? 0
    const jobsLastMonth = jobsLastMonthRes.count ?? 0
    const jobsLast30 = jobsLast30Res.count ?? 0
    const avgJobsPerMember = totalActive > 0 ? Math.round((jobsLast30 / totalActive) * 10) / 10 : 0
    const leadsAccepted = leadsAcceptedRes.count ?? 0
    const leadsTotal = leadsTotalRes.count ?? 0
    const acceptanceRate = leadsTotal > 0 ? Math.round((leadsAccepted / leadsTotal) * 100) : 0

    // Referrals
    const referrals = referralsRes.data ?? []
    const totalReferrals = referrals.length
    const convertedReferrals = referrals.filter(r => r.status === 'converted').length
    const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0
    const referralSignupsThisMonth = referralSignupsThisMonthRes.count ?? 0
    const newMembersThisMonth = newMembersThisMonthCountRes.count ?? 0
    const pctFromReferral = newMembersThisMonth > 0 ? Math.round((referralSignupsThisMonth / newMembersThisMonth) * 100) : 0

    // NPS (rolling 90 days)
    const npsScores = ((npsRes as any).data ?? []).map((r: any) => r.score)
    let npsScore: number | null = null
    if (npsScores.length > 0) {
      const promoters = npsScores.filter((s: number) => s >= 9).length
      const detractors = npsScores.filter((s: number) => s <= 6).length
      npsScore = Math.round(((promoters - detractors) / npsScores.length) * 100)
    }

    // Cancellations this month from Stripe
    let cancellationsThisMonth = 0
    try {
      const canceled = await stripe.subscriptions.list({
        status: 'canceled',
        limit: 100,
        created: { gte: startOfMonthTs },
      })
      cancellationsThisMonth = canceled.data.length
    } catch (_e) {
      // Non-critical
    }

    return new Response(JSON.stringify({
      members: { total_active: totalActive, new_this_month: newThisMonth, new_last_month: newLastMonth, mom_growth_pct: momGrowthPct },
      contractors: { total_active: totalActiveContractors, retention_6mo: retention6mo },
      markets: { active_states: activeStates, active_count: activeStates.length, waitlist_by_state: waitlistByState },
      jobs: { total_this_month: jobsThisMonth, total_last_month: jobsLastMonth, avg_per_member: avgJobsPerMember, acceptance_rate: acceptanceRate },
      referrals: { total: totalReferrals, converted: convertedReferrals, conversion_rate: conversionRate, pct_signups_from_referral: pctFromReferral },
      nps: { score: npsScore, response_count: npsScores.length, window_days: 90 },
      cancellations_this_month: cancellationsThisMonth,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('get-kpi-data error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

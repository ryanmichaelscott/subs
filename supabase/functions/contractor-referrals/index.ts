import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ensureReferralCode, attemptPayout, stripeReq } from '../_shared/contractor-referral.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, contractor_id, action = 'stats' } = await req.json()
    if (!email && !contractor_id) return json({ error: 'email or contractor_id required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
    const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'

    const query = supabase.from('contractors')
      .select('id, name, contact_name, contact_email, status, referral_code, referral_promo_id, stripe_connect_account_id')
    const { data: contractor } = contractor_id
      ? await query.eq('id', contractor_id).maybeSingle()
      : await query.eq('contact_email', String(email).toLowerCase().trim()).maybeSingle()

    if (!contractor) return json({ error: 'Contractor not found' }, 404)

    // ── onboard: create Express account if needed, return onboarding link ────
    if (action === 'onboard') {
      let acctId = contractor.stripe_connect_account_id
      if (!acctId) {
        const acct = await stripeReq(stripeKey, 'POST', '/accounts', {
          type: 'express',
          email: contractor.contact_email || '',
          'capabilities[transfers][requested]': 'true',
          'metadata[contractor_id]': contractor.id,
          'business_profile[product_description]': 'SUBS contractor referral commissions',
        })
        if (!acct.ok) return json({ error: acct.data?.error?.message || 'Could not create Stripe account' })
        acctId = acct.data.id
        await supabase.from('contractors').update({ stripe_connect_account_id: acctId }).eq('id', contractor.id)
      }
      const link = await stripeReq(stripeKey, 'POST', '/account_links', {
        account: acctId,
        refresh_url: `${appUrl}/contractor/dashboard?connect=retry`,
        return_url: `${appUrl}/contractor/dashboard?connect=return`,
        type: 'account_onboarding',
      })
      if (!link.ok) return json({ error: link.data?.error?.message || 'Could not create onboarding link' })
      return json({ url: link.data.url })
    }

    // ── sync: pay out any confirmed-but-unpaid commissions ───────────────────
    if (action === 'sync') {
      const { data: unpaid } = await supabase
        .from('contractor_referrals')
        .select('*')
        .eq('contractor_id', contractor.id)
        .eq('status', 'confirmed')
        .is('stripe_transfer_id', null)
      let paidCount = 0
      for (const r of unpaid || []) {
        if (await attemptPayout(supabase, stripeKey, r)) paidCount++
      }
      return json({ paid_count: paidCount })
    }

    // ── stats (default): ensure code exists, return everything ───────────────
    const { code } = await ensureReferralCode(supabase, stripeKey, contractor)

    const { data: referrals } = await supabase
      .from('contractor_referrals')
      .select('id, referral_type, member_email, plan, sale_amount, commission_amount, status, created_at, paid_at')
      .eq('contractor_id', contractor.id)
      .order('created_at', { ascending: false })

    const rows = referrals || []
    const sum = (arr: any[]) => arr.reduce((s, r) => s + Number(r.commission_amount), 0)
    const pendingRows   = rows.filter(r => r.status === 'pending')
    const confirmedRows = rows.filter(r => r.status === 'confirmed')
    const paidRows      = rows.filter(r => r.status === 'paid')

    // Connect status
    let payoutsEnabled = false
    if (contractor.stripe_connect_account_id && stripeKey) {
      const acct = await stripeReq(stripeKey, 'GET', `/accounts/${contractor.stripe_connect_account_id}`)
      payoutsEnabled = !!(acct.ok && acct.data.payouts_enabled)
    }

    return json({
      referral_code: code,
      referral_link: code ? `${appUrl}/?ref=${code}` : null,
      referrals: rows,
      totals: {
        count: rows.length,
        pending: Math.round(sum(pendingRows) * 100) / 100,
        unpaid: Math.round(sum(confirmedRows) * 100) / 100,
        paid: Math.round(sum(paidRows) * 100) / 100,
      },
      connect: {
        has_account: !!contractor.stripe_connect_account_id,
        payouts_enabled: payoutsEnabled,
      },
    })
  } catch (e) {
    console.error('[contractor-referrals]', e.message)
    return json({ error: e.message }, 500)
  }
})

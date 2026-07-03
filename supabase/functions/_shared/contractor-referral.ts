// Shared contractor-referral helpers — imported by approve-contractor,
// stripe-webhook, and contractor-referrals edge functions.

const REFERRAL_COUPON_ID = 'SUBS-REFERRAL-10'
export const COMMISSION_RATE = 0.30

export async function stripeReq(key: string, method: string, path: string, params?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? new URLSearchParams(params) : undefined,
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

function slugifyName(name: string): string {
  const words = (name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w && !['LLC', 'INC', 'CO', 'CORP', 'LTD', 'THE'].includes(w))
  let slug = ''
  for (const w of words) {
    const next = slug ? `${slug}-${w}` : w
    if (next.length > 18 && slug) break
    slug = next
  }
  return slug || 'PARTNER'
}

async function ensureCoupon(stripeKey: string): Promise<boolean> {
  const get = await stripeReq(stripeKey, 'GET', `/coupons/${REFERRAL_COUPON_ID}`)
  if (get.ok) return true
  const create = await stripeReq(stripeKey, 'POST', '/coupons', {
    id: REFERRAL_COUPON_ID,
    percent_off: '10',
    duration: 'once',
    name: 'SUBS Referral — 10% off',
  })
  if (!create.ok) console.error('[referral] coupon create failed:', JSON.stringify(create.data).slice(0, 300))
  return create.ok
}

// Generate + persist a unique referral code and matching Stripe promotion code.
// Safe to call repeatedly — no-ops once both exist.
export async function ensureReferralCode(supabase: any, stripeKey: string, contractor: any):
  Promise<{ code: string | null; promoId: string | null }> {
  let code: string | null = contractor.referral_code || null
  let promoId: string | null = contractor.referral_promo_id || null
  if (code && promoId) return { code, promoId }

  // 1. Claim a unique code in the DB
  if (!code) {
    const base = slugifyName(contractor.name || contractor.contact_name || '')
    for (let i = 0; i < 6; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`
      const { error } = await supabase
        .from('contractors')
        .update({ referral_code: candidate })
        .eq('id', contractor.id)
      if (!error) { code = candidate; break }
    }
    if (!code) {
      console.error('[referral] could not claim a unique code for', contractor.id)
      return { code: null, promoId: null }
    }
  }

  // 2. Create the Stripe promotion code (10% off, first payment)
  if (!promoId && stripeKey) {
    await ensureCoupon(stripeKey)
    const create = await stripeReq(stripeKey, 'POST', '/promotion_codes', {
      coupon: REFERRAL_COUPON_ID,
      code,
    })
    if (create.ok) {
      promoId = create.data.id
    } else {
      // Code may already exist in Stripe — look it up
      const list = await stripeReq(stripeKey, 'GET', `/promotion_codes?code=${encodeURIComponent(code)}&limit=1`)
      if (list.ok && list.data.data?.[0]) promoId = list.data.data[0].id
      else console.error('[referral] promo code create failed:', JSON.stringify(create.data).slice(0, 300))
    }
    if (promoId) {
      await supabase.from('contractors').update({ referral_promo_id: promoId }).eq('id', contractor.id)
    }
  }

  return { code, promoId }
}

// Transfer the commission to the contractor's connected account.
// Returns true only when the money actually moved. Referrals stay 'confirmed'
// until this succeeds (no account, onboarding incomplete, or insufficient balance).
export async function attemptPayout(supabase: any, stripeKey: string, referral: any): Promise<boolean> {
  if (referral.status !== 'confirmed' || referral.stripe_transfer_id) return false

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, stripe_connect_account_id')
    .eq('id', referral.contractor_id)
    .single()

  const acctId = contractor?.stripe_connect_account_id
  if (!acctId) return false

  const acct = await stripeReq(stripeKey, 'GET', `/accounts/${acctId}`)
  if (!acct.ok || !acct.data.payouts_enabled) return false

  const cents = Math.round(Number(referral.commission_amount) * 100)
  const transfer = await stripeReq(stripeKey, 'POST', '/transfers', {
    amount: String(cents),
    currency: 'usd',
    destination: acctId,
    description: `SUBS referral commission (${referral.referral_type || 'member'}: ${referral.member_email || referral.id})`,
    'metadata[referral_id]': referral.id,
  })

  if (!transfer.ok) {
    console.error('[referral] transfer failed:', JSON.stringify(transfer.data).slice(0, 300))
    return false
  }

  await supabase.from('contractor_referrals').update({
    status: 'paid',
    stripe_transfer_id: transfer.data.id,
    paid_at: new Date().toISOString(),
  }).eq('id', referral.id)

  console.log(`[referral] paid $${referral.commission_amount} to ${acctId} (referral ${referral.id})`)
  return true
}

// Flip a pending referral to confirmed and try to pay it out immediately.
export async function confirmAndPay(supabase: any, stripeKey: string, referral: any) {
  if (referral.status === 'pending') {
    await supabase.from('contractor_referrals').update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    }).eq('id', referral.id).eq('status', 'pending')
    referral = { ...referral, status: 'confirmed' }
  }
  await attemptPayout(supabase, stripeKey, referral)
}

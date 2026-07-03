import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { day1Email, day3Email, day14Email } from '../_shared/contractor-emails.ts'
import { ensureReferralCode } from '../_shared/contractor-referral.ts'

// Daily cron: sends the contractor onboarding sequence (days 1 / 3 / 14 after
// activation). Day 0 sends from confirm-contractor-subscription. Idempotent —
// the unique (contractor_id, email_key) constraint guards duplicates, and each
// email only sends inside its window so a stalled cron never dumps stale mail.
const STEPS = [
  { key: 'day1_setup',          minDays: 1,  maxDays: 7 },
  { key: 'day3_referral',       minDays: 3,  maxDays: 14 },
  { key: 'day14_referral_nudge', minDays: 14, maxDays: 45 },
]

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'
  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })

  const { data: contractors, error } = await supabase
    .from('contractors')
    .select('id, name, contact_name, contact_email, status, activated_at, referral_code, referral_promo_id')
    .eq('status', 'active')
    .not('activated_at', 'is', null)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const sent: any[] = []

  for (const c of contractors || []) {
    if (!c.contact_email) continue
    const days = Math.floor((Date.now() - new Date(c.activated_at).getTime()) / 86400000)

    const { data: already } = await supabase
      .from('contractor_sequence_emails')
      .select('email_key')
      .eq('contractor_id', c.id)
    const sentKeys = new Set((already || []).map(r => r.email_key))

    // One email per contractor per run — earliest due step first
    const step = STEPS.find(s => days >= s.minDays && days < s.maxDays && !sentKeys.has(s.key))
    if (!step) continue

    // Claim the send before building — unique constraint is the duplicate guard
    const { error: claimErr } = await supabase
      .from('contractor_sequence_emails')
      .insert({ contractor_id: c.id, email_key: step.key })
    if (claimErr) continue

    const firstName = (c.contact_name || c.name || 'Partner').trim().split(/\s+/)[0]
    let email: { subject: string; html: string }

    if (step.key === 'day1_setup') {
      email = day1Email(firstName, appUrl)
    } else {
      const { code } = await ensureReferralCode(supabase, stripeKey, c)
      if (!code) { console.error('[sequence] no referral code for', c.id); continue }
      if (step.key === 'day3_referral') {
        email = day3Email(firstName, code, appUrl)
      } else {
        const { data: refs } = await supabase
          .from('contractor_referrals')
          .select('status, commission_amount')
          .eq('contractor_id', c.id)
        const count = refs?.length || 0
        const unpaid = (refs || [])
          .filter(r => r.status === 'confirmed')
          .reduce((s, r) => s + Number(r.commission_amount), 0)
        email = day14Email(firstName, code, appUrl, { count, unpaid })
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'SUBS <hello@subs.app>', to: c.contact_email, subject: email.subject, html: email.html }),
    })
    if (!res.ok) {
      console.error('[sequence] resend failed for', c.contact_email, await res.text())
      // Release the claim so it retries tomorrow
      await supabase.from('contractor_sequence_emails').delete()
        .eq('contractor_id', c.id).eq('email_key', step.key)
      continue
    }
    sent.push({ contractor: c.name, email: step.key })
  }

  console.log(`[sequence] sent ${sent.length} emails`)
  return new Response(JSON.stringify({ sent_count: sent.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

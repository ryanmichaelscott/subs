import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Home maintenance checklist email ───────────────────────────────────────
const SEASONS = [
  { name: 'Spring', months: 'March — May', emoji: '🌱', color: '#5DFF8A', bg: '#0C1A0F', border: '#1A3A20',
    tasks: [
      { title: 'HVAC Filter Change', desc: 'Replace or clean air filters before cooling season.' },
      { title: 'Gutter Cleaning', desc: 'Clear winter debris and check for sags before spring rains.' },
      { title: 'Exterior Inspection', desc: 'Check siding, foundation, trim, and caulking for winter damage.' },
      { title: 'Sprinkler Startup', desc: 'Turn on irrigation, test each zone, check heads for clogs.' },
      { title: 'Window Washing', desc: 'Clean glass, inspect seals, and lubricate tracks.' },
    ],
  },
  { name: 'Summer', months: 'June — August', emoji: '☀️', color: '#F5A623', bg: '#1A1308', border: '#3A2A0A',
    tasks: [
      { title: 'Pest Control Treatment', desc: 'Schedule perimeter treatment before peak season.' },
      { title: 'Deck Inspection', desc: 'Check boards for rot, loose fasteners, and structural integrity.' },
      { title: 'AC Tune-Up', desc: 'Service condenser coils, refrigerant levels, and thermostat calibration.' },
      { title: 'Lawn Fertilization', desc: 'Apply summer-formula fertilizer and spot-treat weeds.' },
    ],
  },
  { name: 'Fall', months: 'September — November', emoji: '🍂', color: '#FF8C42', bg: '#1A0F08', border: '#3A1E0A',
    tasks: [
      { title: 'Furnace Inspection', desc: 'Test ignition, clean burners, replace filters before first use.' },
      { title: 'Gutter Cleaning', desc: 'Clear fallen leaves before freeze-thaw cycles begin.' },
      { title: 'Weatherstripping Check', desc: 'Inspect and replace seals around doors and windows.' },
      { title: 'Roof Inspection', desc: 'Check for missing or curling shingles before snow loads.' },
    ],
  },
  { name: 'Winter', months: 'December — February', emoji: '❄️', color: '#5B8DEF', bg: '#08100F', border: '#0A1E3A',
    tasks: [
      { title: 'Pipe Insulation Check', desc: 'Inspect exposed pipes in unheated spaces, add foam wrap.' },
      { title: 'Smoke Detector Test', desc: 'Test all units, replace batteries, check CO detectors.' },
      { title: 'Water Heater Flush', desc: 'Flush sediment from tank to maintain efficiency.' },
      { title: 'Emergency Kit Review', desc: 'Check flashlights, batteries, first-aid, and food/water supplies.' },
    ],
  },
]

function seasonBlock(s: typeof SEASONS[0]): string {
  const taskRows = s.tasks.map((t, i) => `
    <tr>
      <td style="padding:0 0 ${i < s.tasks.length - 1 ? '13' : '0'}px 0;vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="26" style="vertical-align:top;padding-top:2px;">
            <div style="width:18px;height:18px;border-radius:4px;border:2px solid ${s.color}55;display:inline-block;"></div>
          </td>
          <td style="padding-left:10px;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
            <div style="font-size:14px;font-weight:700;color:#F0EEE8;margin-bottom:2px;">${t.title}</div>
            <div style="font-size:12px;color:#8A9088;line-height:1.5;">${t.desc}</div>
          </td>
        </tr></table>
      </td>
    </tr>`).join('')
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;">
      <tr><td style="background:${s.bg};border:1px solid ${s.border};border-radius:14px;overflow:hidden;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:18px 22px 14px 22px;border-bottom:1px solid ${s.border};">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="38" style="font-size:24px;line-height:1;vertical-align:middle;">${s.emoji}</td>
              <td style="padding-left:10px;vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                <div style="font-size:10px;font-weight:800;color:${s.color};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1px;">${s.name}</div>
                <div style="font-size:14px;font-weight:700;color:#F0EEE8;">${s.months}</div>
              </td>
              <td align="right" style="vertical-align:middle;">
                <div style="font-size:11px;color:${s.color};font-weight:600;background:${s.color}18;border-radius:20px;padding:3px 10px;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">${s.tasks.length} tasks</div>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:16px 22px 18px 22px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">${taskRows}</table>
          </td></tr>
        </table>
      </td></tr>
    </table>`
}

function checklistEmailHtml(name: string, tier: string): string {
  const firstName = name?.split(' ')[0] || 'there'
  const tierColor = tier === 'Elite' ? '#9B7FE8' : '#5B8DEF'
  const tierLabel = tier === 'Elite' ? 'Elite' : 'Member+'
  const sections = SEASONS.map(s => seasonBlock(s)).join('')
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Your SUBS Home Maintenance Checklist</title></head>
<body style="margin:0;padding:0;background:#0C0F0A;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr><td align="center" style="padding:40px 16px 48px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

  <!-- Logo bar -->
  <tr><td style="padding-bottom:28px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td><div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">SUBS</div></td>
      <td align="right"><div style="font-size:11px;font-weight:700;color:${tierColor};background:${tierColor}22;border-radius:20px;padding:5px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">${tierLabel} Member</div></td>
    </tr></table>
    <div style="height:1px;background:#252A23;margin-top:16px;"></div>
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding-bottom:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Your Annual Checklist</div>
    <h1 style="font-size:30px;font-weight:800;color:#F0EEE8;margin:0 0 12px;line-height:1.2;">Never miss a thing, ${firstName}.</h1>
    <p style="font-size:14px;color:#8A9088;line-height:1.7;margin:0 0 18px;">Your year-round home maintenance guide — 17 tasks across all four seasons. Save or print this email and check off tasks as you go.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:#141814;border:1px solid #252A23;border-radius:10px;padding:11px 18px;">
        <span style="font-size:13px;color:#8A9088;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
          <span style="color:#5DFF8A;font-weight:700;">17</span> tasks &nbsp;·&nbsp;
          <span style="color:#5DFF8A;font-weight:700;">4</span> seasons &nbsp;·&nbsp;
          <span style="color:#5DFF8A;font-weight:700;">1</span> year of protection
        </span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Seasons -->
  <tr><td>${sections}</td></tr>

  <!-- CTA -->
  <tr><td style="padding-top:8px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0A1A0F;border:1px solid #1A3A20;border-radius:14px;">
      <tr><td style="padding:26px 26px 24px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
        <div style="font-size:10px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">Ready to book?</div>
        <div style="font-size:17px;font-weight:700;color:#F0EEE8;margin-bottom:8px;">Need help with any of these?</div>
        <p style="font-size:13px;color:#8A9088;line-height:1.6;margin:0 0 18px;">Every task on this checklist is available through your SUBS member dashboard. Submit a service request and we'll match you with a vetted contractor at your member rate.</p>
        <a href="https://subs.app/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:800;padding:12px 26px;border-radius:10px;text-decoration:none;">Submit a service request →</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="height:36px;"></td></tr>
  <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
  <tr><td style="padding-top:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td><div style="font-size:12px;color:#8A9088;line-height:1.9;">
        Questions? Call or text <span style="color:#F0EEE8;">1-888-454-3019</span> or visit <a href="https://subs.app" style="color:#5DFF8A;text-decoration:none;">subs.app</a><br>
        You're receiving this as a SUBS ${tierLabel} member.<br>
        <span style="color:#3A3E38;">© ${year} SUBS. All rights reserved.</span>
      </div></td>
      <td align="right" style="vertical-align:bottom;"><div style="font-size:20px;font-weight:800;color:#1A1E18;letter-spacing:0.08em;">SUBS</div></td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

const PRICE_TO_TIER: Record<string, string> = {
  'price_1TiRPcAYDs9oVarWLWpp0wLZ': 'Member',
  'price_1TtwA5AYDs9oVarWSOV7SwP7': 'Full',
  'price_1TjQ8TAYDs9oVarWqCQyxLM5': 'Member+',
  'price_1TjQ7DAYDs9oVarWbJONkQ1P': 'Elite',
}

// Get or create a coupon with a fixed ID so it's idempotent
async function ensureCoupon(stripe: Stripe, id: string, params: object) {
  try {
    return await stripe.coupons.retrieve(id)
  } catch (_e) {
    return await stripe.coupons.create({ id, ...params })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { checkout_session_id, clerk_user_id } = await req.json()

    if (!checkout_session_id || !clerk_user_id) {
      return new Response(JSON.stringify({ error: 'checkout_session_id and clerk_user_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!

    const sessionRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${checkout_session_id}?expand[]=subscription`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } },
    )
    const session = await sessionRes.json()

    if (!sessionRes.ok) {
      console.error('Stripe session fetch failed:', session)
      return new Response(JSON.stringify({ error: 'Failed to verify checkout session' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (session.status !== 'complete') {
      return new Response(JSON.stringify({ error: `Session not complete (status: ${session.status})` }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (session.metadata?.clerk_user_id !== clerk_user_id) {
      return new Response(JSON.stringify({ error: 'Session does not belong to this user' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

    const customerId = session.customer
    const priceId = session.subscription?.items?.data?.[0]?.price?.id
    const tier = PRICE_TO_TIER[priceId] || 'Member'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await supabase
      .from('members')
      .select('*')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    let member
    if (existing) {
      const { data } = await supabase
        .from('members')
        .update({ tier, status: 'Active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId })
        .eq('clerk_user_id', clerk_user_id)
        .select()
        .single()
      member = data || existing
    } else {
      const sessionEmail = session.customer_details?.email || session.customer_email || ''
      const { data } = await supabase
        .from('members')
        .insert({
          clerk_user_id,
          email: sessionEmail,
          tier,
          status: 'Active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .select()
        .single()
      member = data
    }

    // Send home maintenance checklist to Member+ and Elite (non-critical)
    if ((tier === 'Member+' || tier === 'Elite') && member?.email) {
      try {
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey) {
          const memberName = member.name || session.customer_details?.name || ''
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'SUBS <hello@subs.app>',
              to: member.email,
              subject: 'Your SUBS Home Maintenance Checklist — never miss a thing.',
              html: checklistEmailHtml(memberName, tier),
            }),
          })
        }
      } catch (checklistErr) {
        console.error('Checklist email error:', checklistErr)
      }
    }

    // Handle referral conversion reward (non-critical — failure does not break activation)
    try {
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, referrer_member_id')
        .eq('referred_clerk_user_id', clerk_user_id)
        .eq('status', 'pending')
        .single()

      if (referral) {
        await supabase.from('referrals')
          .update({ status: 'converted', converted_at: new Date().toISOString() })
          .eq('id', referral.id)

        const { count } = await supabase.from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_member_id', referral.referrer_member_id)
          .eq('status', 'converted')

        const { data: referrer } = await supabase
          .from('members')
          .select('stripe_subscription_id, email, name, referral_code')
          .eq('id', referral.referrer_member_id)
          .single()

        // Apply Stripe coupon at milestones 1 and 3
        if ((count === 1 || count === 3) && referrer?.stripe_subscription_id) {
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
          const isFreeYear = count === 3

          await ensureCoupon(stripe, isFreeYear ? 'REFER3' : 'REFER1',
            isFreeYear
              ? { percent_off: 100, duration: 'once', name: 'SUBS Free Year – 3 Referrals' }
              : { amount_off: 2000, currency: 'usd', duration: 'once', name: 'SUBS $20 Off – Referral' }
          )

          await stripe.subscriptions.update(referrer.stripe_subscription_id, {
            coupon: isFreeYear ? 'REFER3' : 'REFER1',
          })

          await supabase.from('referrals')
            .update({ reward_applied: isFreeYear ? 'free_year' : 'discount_20' })
            .eq('id', referral.id)
        }

        // Email referrer on every conversion
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey && referrer?.email) {
          const firstName = referrer.name?.split(' ')[0] || 'there'
          const referredName = member?.name?.split(' ')[0] || 'Someone'
          const isFreeYear = count === 3
          const refLink = referrer.referral_code ? `https://subs.app/?ref=${referrer.referral_code}` : 'https://subs.app/dashboard'

          let subject: string
          let html: string

          if (isFreeYear) {
            subject = `Your next year of SUBS is free, ${firstName}!`
            html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0C0F0A;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr><td align="center" style="padding:40px 16px 48px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <tr><td style="padding-bottom:24px;">
    <div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;">SUBS</div>
    <div style="height:1px;background:#252A23;margin-top:16px;"></div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Referral Goal Reached</div>
    <h1 style="font-size:28px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.2;">Your next year is on us, ${firstName}.</h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0;">You referred 3 paying members. That's the goal — and your reward is a 100% discount on your next annual renewal. It's been applied automatically. No action needed.</p>
  </td></tr>
  <tr><td style="padding-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0A1A0F;border:1px solid #1A3A20;border-radius:14px;">
      <tr><td style="padding:22px 26px;">
        <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Your reward</div>
        <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:4px;">Free year</div>
        <div style="font-size:13px;color:#8A9088;">100% off your next annual renewal — applied automatically</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding-bottom:32px;">
    <a href="https://subs.app/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none;">View your dashboard →</a>
  </td></tr>
  <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
  <tr><td style="padding-top:20px;">
    <div style="font-size:12px;color:#8A9088;line-height:1.8;">Questions? Call or text <span style="color:#F0EEE8;">1-888-454-3019</span> or visit <a href="https://subs.app" style="color:#5DFF8A;text-decoration:none;">subs.app</a></div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
          } else if (count === 1) {
            subject = `${referredName} just joined! You've earned $20 off your renewal.`
            html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0C0F0A;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr><td align="center" style="padding:40px 16px 48px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <tr><td style="padding-bottom:24px;">
    <div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;">SUBS</div>
    <div style="height:1px;background:#252A23;margin-top:16px;"></div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Referral Reward</div>
    <h1 style="font-size:28px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.2;">${referredName} just joined SUBS, ${firstName}.</h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0;">You earned <strong style="color:#5DFF8A;">$20 off</strong> your next annual renewal — it's been applied to your account automatically. Keep going: refer 2 more members and your entire next year of SUBS is on us.</p>
  </td></tr>
  <tr><td style="padding-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141814;border:1px solid #252A23;border-radius:14px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:11px;font-weight:800;color:#8A9088;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:14px;">Your progress</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="33%" align="center" style="padding:0 6px 0 0;">
            <div style="background:#0A1A0F;border:2px solid #5DFF8A;border-radius:10px;padding:14px 10px;">
              <div style="font-size:22px;font-weight:800;color:#5DFF8A;">1</div>
              <div style="font-size:11px;color:#5DFF8A;font-weight:700;margin-top:4px;">Referral</div>
              <div style="font-size:10px;color:#8A9088;margin-top:2px;">$20 off ✓</div>
            </div>
          </td>
          <td width="33%" align="center" style="padding:0 3px;">
            <div style="background:#0D100D;border:1px solid #252A23;border-radius:10px;padding:14px 10px;opacity:0.5;">
              <div style="font-size:22px;font-weight:800;color:#3A3E38;">2</div>
              <div style="font-size:11px;color:#3A3E38;font-weight:700;margin-top:4px;">Referrals</div>
              <div style="font-size:10px;color:#3A3E38;margin-top:2px;">pending</div>
            </div>
          </td>
          <td width="33%" align="center" style="padding:0 0 0 6px;">
            <div style="background:#0D100D;border:1px solid #252A23;border-radius:10px;padding:14px 10px;opacity:0.5;">
              <div style="font-size:22px;font-weight:800;color:#3A3E38;">3</div>
              <div style="font-size:11px;color:#3A3E38;font-weight:700;margin-top:4px;">Referrals</div>
              <div style="font-size:10px;color:#3A3E38;margin-top:2px;">Free year</div>
            </div>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding-bottom:20px;">
    <div style="background:#0C1A18;border:1px solid #1A2E2A;border-radius:12px;padding:18px 22px;">
      <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Your referral link</div>
      <div style="font-size:13px;color:#5DFF8A;word-break:break-all;margin-bottom:14px;">${refLink}</div>
      <a href="${refLink}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:13px;font-weight:800;padding:11px 22px;border-radius:9px;text-decoration:none;">Share my link →</a>
    </div>
  </td></tr>
  <tr><td style="padding-bottom:32px;">
    <a href="https://subs.app/dashboard" style="font-size:13px;color:#8A9088;text-decoration:none;">View dashboard →</a>
  </td></tr>
  <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
  <tr><td style="padding-top:20px;">
    <div style="font-size:12px;color:#8A9088;line-height:1.8;">Questions? Call or text <span style="color:#F0EEE8;">1-888-454-3019</span> or visit <a href="https://subs.app" style="color:#5DFF8A;text-decoration:none;">subs.app</a></div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
          } else {
            subject = count === 2
              ? `${referredName} joined — 1 more referral = a free year!`
              : `${referredName} joined — ${count} of 3 referrals`
            html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0C0F0A;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr><td align="center" style="padding:40px 16px 48px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <tr><td style="padding-bottom:24px;">
    <div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;">SUBS</div>
    <div style="height:1px;background:#252A23;margin-top:16px;"></div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Referral Update</div>
    <h1 style="font-size:28px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.2;">${referredName} just joined, ${firstName}.</h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0;">${count === 2 ? `You're one referral away from a <strong style="color:#5DFF8A;">completely free</strong> year of SUBS. Share your link one more time.` : `You're at ${count} of 3 paying referrals. Keep going — 3 total unlocks a free year.`}</p>
  </td></tr>
  <tr><td style="padding-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141814;border:1px solid #252A23;border-radius:12px;">
      <tr><td style="padding:18px 22px;">
        <div style="font-size:13px;color:#8A9088;margin-bottom:6px;">Your progress</div>
        <div style="font-size:17px;font-weight:700;color:#F0EEE8;">${count} of 3 paying referrals</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding-bottom:32px;">
    <a href="${refLink}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none;">Share my referral link →</a>
  </td></tr>
  <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
  <tr><td style="padding-top:20px;">
    <div style="font-size:12px;color:#8A9088;line-height:1.8;">Questions? Call or text <span style="color:#F0EEE8;">1-888-454-3019</span> or visit <a href="https://subs.app" style="color:#5DFF8A;text-decoration:none;">subs.app</a></div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
          }

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'SUBS <hello@subs.app>', to: referrer.email, subject, html }),
          })
        }
      }
    } catch (refErr) {
      console.error('Referral reward error:', refErr)
    }

    // Schedule 24h referral nudge email for new activations (non-critical)
    try {
      const isFirstActivation = !existing || existing.status !== 'Active'
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (isFirstActivation && resendKey && member?.email && member?.referral_code) {
        const firstName = (member.name || session.customer_details?.name || '').split(' ')[0] || 'there'
        const refLink = `https://subs.app/?ref=${member.referral_code}`
        const sendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SUBS <hello@subs.app>',
            to: member.email,
            subject: 'Know a homeowner? Share SUBS and earn $20 — or a free year.',
            scheduled_at: sendAt,
            html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0C0F0A;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr><td align="center" style="padding:40px 16px 48px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <tr><td style="padding-bottom:24px;">
    <div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;">SUBS</div>
    <div style="height:1px;background:#252A23;margin-top:16px;"></div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Member Referral Program</div>
    <h1 style="font-size:28px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.2;">Know a homeowner, ${firstName}?</h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0;">Share SUBS with neighbors and friends. Every time someone joins using your link, you earn a reward — automatically, no tracking required.</p>
  </td></tr>
  <tr><td style="padding-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #252A23;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#141814;padding:20px 24px;border-bottom:1px solid #252A23;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="40" style="vertical-align:top;padding-top:2px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#0A1A0F;border:1px solid #1A3A20;display:flex;align-items:center;justify-content:center;font-size:16px;">1</div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <div style="font-size:15px;font-weight:700;color:#F0EEE8;margin-bottom:4px;">1 paying referral</div>
            <div style="font-size:13px;color:#8A9088;line-height:1.5;"><strong style="color:#5DFF8A;">$20 off</strong> your next annual renewal — applied automatically</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#0A1A0F;padding:20px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="40" style="vertical-align:top;padding-top:2px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#0C1A0F;border:1px solid #2A4A30;display:flex;align-items:center;justify-content:center;font-size:16px;color:#5DFF8A;font-weight:700;">3</div>
          </td>
          <td style="padding-left:14px;vertical-align:top;">
            <div style="font-size:15px;font-weight:700;color:#F0EEE8;margin-bottom:4px;">3 paying referrals</div>
            <div style="font-size:13px;color:#8A9088;line-height:1.5;">Your <strong style="color:#5DFF8A;">next annual renewal is completely free</strong> — 100% off, automatic</div>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding-bottom:24px;">
    <div style="background:#0C1A18;border:1px solid #1A2E2A;border-radius:12px;padding:20px 24px;">
      <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Your referral link</div>
      <div style="font-size:13px;color:#5DFF8A;word-break:break-all;margin-bottom:16px;">${refLink}</div>
      <a href="${refLink}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:800;padding:13px 26px;border-radius:10px;text-decoration:none;">Share my link →</a>
    </div>
  </td></tr>
  <tr><td style="padding-bottom:10px;">
    <p style="font-size:13px;color:#8A9088;line-height:1.7;margin:0;">Track your referrals anytime from your <a href="https://subs.app/dashboard" style="color:#5DFF8A;text-decoration:none;">member dashboard</a>. Rewards are applied automatically when a referred member completes their first payment — no codes, no claiming.</p>
  </td></tr>
  <tr><td style="height:24px;"></td></tr>
  <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
  <tr><td style="padding-top:20px;">
    <div style="font-size:12px;color:#8A9088;line-height:1.8;">Questions? Call or text <span style="color:#F0EEE8;">1-888-454-3019</span> or visit <a href="https://subs.app" style="color:#5DFF8A;text-decoration:none;">subs.app</a></div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          }),
        })
      }
    } catch (nudgeErr) {
      console.error('Referral nudge email error:', nudgeErr)
    }

    return new Response(JSON.stringify({ member }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('activate-membership error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

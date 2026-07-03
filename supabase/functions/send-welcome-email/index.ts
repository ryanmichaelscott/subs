import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIER_PERKS: Record<string, string[]> = {
  Member: [
    'Contractor-rate pricing on 39 trades (20–35% off)',
    'Up to 5 service requests per year',
    'Digital membership card (Apple & Google Wallet)',
    'Concierge line — call or text us to book',
    '30-day money-back guarantee',
  ],
  'Member+': [
    'Unlimited service requests',
    'Enhanced pricing + priority access',
    'Priority concierge — skip the queue',
    'Digital membership card (Apple & Google Wallet)',
    'All 39 trades covered',
  ],
  Elite: [
    'Unlimited service requests',
    'Best available rates + VIP priority scheduling',
    'White-glove concierge — we schedule everything, you do nothing',
    'Same-week scheduling guaranteed',
    'Dedicated SUBS home advisor',
    'First access to top-rated contractors in your area',
  ],
}

function buildEmail(name: string, tier: string, magicLink: string): string {
  const perks = TIER_PERKS[tier] || TIER_PERKS['Member']
  const perksHtml = perks.map(p =>
    `<li style="font-size:15px;color:#444;line-height:1.9;list-style:none;padding:3px 0;">✓ ${p}</li>`
  ).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#f5f5f5;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:40px 36px;">
    <div style="font-size:22px;font-weight:800;letter-spacing:0.06em;color:#1a1a1a;margin-bottom:28px;">SUBS.</div>

    <p style="font-size:17px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Hi ${name} — welcome to SUBS.</p>
    <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 20px;">
      Your <strong>${tier} membership</strong> is active and your contractor pricing is ready.
    </p>

    <div style="background:#f9f9f9;border-radius:10px;padding:18px 20px;margin-bottom:28px;">
      <p style="font-size:13px;font-weight:700;color:#1a1a1a;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">What's included</p>
      <ul style="margin:0;padding:0;">
        ${perksHtml}
      </ul>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${magicLink}"
         style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:16px;font-weight:700;
                padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">
        Access my dashboard →
      </a>
      <p style="font-size:12px;color:#aaa;margin:10px 0 0;">This link signs you in automatically. Expires in 24 hours.</p>
    </div>

    <div style="border-top:1px solid #eee;padding-top:24px;margin-top:8px;">
      <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 6px;">To book a service:</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0;">
        Call or text <strong><a href="tel:18884543019" style="color:#1a1a1a;text-decoration:none;">1-888-454-3019</a></strong>
        and we'll match you with a vetted pro at your member rate.
      </p>
    </div>

    <div style="border-top:1px solid #eee;padding-top:24px;margin-top:24px;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;padding-right:16px;width:56px;">
            <img src="https://subs.app/icons/icon-192.png" alt="SUBS app icon" width="56" height="56" style="border-radius:13px;display:block;" />
          </td>
          <td style="vertical-align:top;">
            <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 6px;">Add SUBS to your home screen</p>
            <p style="font-size:13.5px;color:#555;line-height:1.7;margin:0;">
              One tap to your membership card, jobs, and pricing — no app store needed.<br/>
              <strong>iPhone:</strong> open <a href="https://subs.app/dashboard" style="color:#1a1a1a;">subs.app</a> in Safari, tap the <strong>Share</strong> button (⬆️), then <strong>Add to Home Screen</strong>.<br/>
              <strong>Android:</strong> open <a href="https://subs.app/dashboard" style="color:#1a1a1a;">subs.app</a> in Chrome, tap the <strong>⋮ menu</strong>, then <strong>Add to Home screen</strong>.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size:13px;color:#aaa;margin-top:32px;">
      — The SUBS Team · <a href="https://subs.app" style="color:#aaa;text-decoration:none;">subs.app</a>
    </p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { email, name, tier, magic_link } = await req.json()
  if (!email) {
    return new Response(JSON.stringify({ error: 'email required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dashboardLink = magic_link || 'https://subs.app/login'
  const tierName = tier || 'Member'
  const firstName = (name || 'there').split(' ')[0]

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SUBS <hello@subs.app>',
      to: email,
      subject: `Welcome to SUBS — you're in`,
      html: buildEmail(firstName, tierName, dashboardLink),
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

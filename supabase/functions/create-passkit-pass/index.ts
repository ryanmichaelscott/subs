import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function tierBadgeColor(tier: string): string {
  if (tier === 'Elite') return '#F5A623'
  if (tier === 'Member+') return '#5B8DEF'
  return '#5DFF8A'
}

function welcomeEmailHtml(
  name: string,
  email: string,
  tier: string,
  memberId: string,
  expiryStr: string,
  passUrl: string,
): string {
  const badgeColor = tierBadgeColor(tier)
  const firstName = name ? name.split(' ')[0] : null
  const expiryDisplay = new Date(expiryStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
              <td align="right"><span style="display:inline-block;background:${badgeColor}22;color:${badgeColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid ${badgeColor}44;">${tier}</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Headline -->
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EEE8;line-height:1.2;">Welcome to SUBS${firstName ? `, ${firstName}` : ''}.</p>
          <p style="margin:0 0 28px;font-size:14px;color:#8A9088;line-height:1.7;">Your membership is active. Add your digital card to your wallet below and show it to your SUBS contractor to receive member pricing.</p>
        </td></tr>

        <!-- Wallet buttons -->
        <tr><td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-right:5px;">
                <a href="${passUrl}" style="display:block;background:#000000;border:1px solid #333;border-radius:10px;padding:14px 12px;text-decoration:none;text-align:center;">
                  <span style="color:#ffffff;font-size:13px;font-weight:600;white-space:nowrap;">&#xF8FF; Add to Apple Wallet</span>
                </a>
              </td>
              <td width="50%" style="padding-left:5px;">
                <a href="${passUrl}" style="display:block;background:#1a73e8;border-radius:10px;padding:14px 12px;text-decoration:none;text-align:center;">
                  <span style="color:#ffffff;font-size:13px;font-weight:600;white-space:nowrap;">G Add to Google Wallet</span>
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Membership details -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#141814;border:1px solid #252A23;border-radius:10px;overflow:hidden;">
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;width:110px;">Member</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${name || email}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Member ID</td>
              <td style="padding:12px 16px;font-size:13px;color:#F0EEE8;font-family:monospace,monospace;letter-spacing:0.04em;">${memberId}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Plan</td>
              <td style="padding:12px 16px;font-size:14px;color:${badgeColor};font-weight:700;">${tier}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Valid through</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${expiryDisplay}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Show card callout -->
        <tr><td style="padding:0 32px 28px;">
          <div style="background:#141814;border:1px solid #252A23;border-left:3px solid #5DFF8A;border-radius:8px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#8A9088;line-height:1.6;">
              Show this card to your SUBS contractor to receive member pricing.
            </p>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <a href="https://getsubs.co/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:8px;text-decoration:none;">Go to my dashboard →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
          <p style="margin:0;font-size:12px;color:#8A9088;">Questions? Call or text <a href="tel:18884543019" style="color:#8A9088;">1-888-454-3019</a> or visit <a href="https://subs.app" style="color:#8A9088;">subs.app</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { clerk_user_id, name, email, tier } = await req.json()

    if (!clerk_user_id || !email || !tier) {
      return new Response(JSON.stringify({ error: 'clerk_user_id, email, and tier are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('PASS_APP_KEY')
    const templates: Record<string, string | undefined> = {
      'Member':  Deno.env.get('PASS_APP_MEMBER_TEMPLATE_ID') || Deno.env.get('PASSKIT_MEMBER_TEMPLATE_ID'),
      'Member+': Deno.env.get('PASS_APP_MEMBER_PLUS_TEMPLATE_ID') || Deno.env.get('PASSKIT_MEMBER_PLUS_TEMPLATE_ID'),
      'Elite':   Deno.env.get('PASS_APP_ELITE_TEMPLATE_ID') || Deno.env.get('PASSKIT_ELITE_TEMPLATE_ID'),
    }
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!apiKey) throw new Error('PASS_APP_KEY not configured')

    const templateId = templates[tier]
    if (!templateId) throw new Error(`No PassKit template configured for tier: ${tier}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch member DB row for id and joined_at
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, joined_at')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (memberError || !member) throw new Error('Member not found in database')

    const joinedAt = member.joined_at ? new Date(member.joined_at) : new Date()
    const year = joinedAt.getFullYear()
    const memberId = `SUB-${year}-${String(member.id).padStart(5, '0')}`

    const expiry = new Date(joinedAt)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const expiryStr = expiry.toISOString().split('T')[0]

    // Issue pass via PassKit REST API
    const auth = btoa(`${apiKey}:`)
    const passkitRes = await fetch(
      `https://api.passkit.net/v1/pass/issue/single/${encodeURIComponent(templateId)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dynamicData: {
            name,
            member_id: memberId,
            tier,
            expiry_date: expiryStr,
          },
          externalId: clerk_user_id,
        }),
      }
    )

    if (!passkitRes.ok) {
      const errText = await passkitRes.text()
      throw new Error(`PassKit API ${passkitRes.status}: ${errText}`)
    }

    const passData = await passkitRes.json()
    // PassKit returns the URL under different keys depending on API version
    const passUrl: string | undefined =
      passData.url ?? passData.pass?.url ?? passData.passUrl ?? passData.walletUrl

    if (!passUrl) {
      throw new Error(`PassKit returned no pass URL. Body: ${JSON.stringify(passData)}`)
    }

    // Persist pass URL on member record
    await supabase
      .from('members')
      .update({ passkit_pass_url: passUrl })
      .eq('clerk_user_id', clerk_user_id)

    // Send welcome email with wallet buttons
    if (resendKey) {
      const html = welcomeEmailHtml(name || '', email, tier, memberId, expiryStr, passUrl)
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: email,
          subject: `Your SUBS ${tier} card is ready`,
          html,
        }),
      })
      if (!emailRes.ok) console.error('Resend welcome email error:', await emailRes.text())
    }

    return new Response(JSON.stringify({ success: true, passUrl, memberId }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('create-passkit-pass error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

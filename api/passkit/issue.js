import { createClient } from '@supabase/supabase-js'
import https from 'node:https'

// Use Node.js https module instead of fetch for PassKit — more reliable in serverless
// and surfaces the real cause (DNS, TLS, timeout) instead of a generic "fetch failed"
function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => data,
            json: () => JSON.parse(data),
          })
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

function tierBadgeColor(tier) {
  if (tier === 'Elite') return '#F5A623'
  if (tier === 'Member+') return '#5B8DEF'
  return '#5DFF8A'
}

function welcomeEmailHtml(name, email, tier, memberId, expiryStr, passUrl) {
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
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
            <td align="right"><span style="display:inline-block;background:${badgeColor}22;color:${badgeColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid ${badgeColor}44;">${tier}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EEE8;line-height:1.2;">Welcome to SUBS${firstName ? `, ${firstName}` : ''}.</p>
          <p style="margin:0 0 28px;font-size:14px;color:#8A9088;line-height:1.7;">Your membership is active. Add your digital card to your wallet and show it to your SUBS contractor to receive member pricing.</p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
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
          </tr></table>
        </td></tr>
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
        <tr><td style="padding:0 32px 28px;">
          <div style="background:#141814;border:1px solid #252A23;border-left:3px solid #5DFF8A;border-radius:8px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#8A9088;line-height:1.6;">Show this card to your SUBS contractor to receive member pricing.</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <a href="https://subs.app/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:8px;text-decoration:none;">Go to my dashboard →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
          <p style="margin:0;font-size:12px;color:#8A9088;">Questions? Call or text <a href="tel:18884543019" style="color:#8A9088;">1-888-454-3019</a> or visit <a href="https://subs.app" style="color:#8A9088;">subs.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  console.log('[passkit/issue] Handler invoked, method:', req.method)

  // Log which env vars are present (names only, not values) — all aliases shown
  const envCheck = {
    PASSKIT_API_KEY: !!process.env.PASSKIT_API_KEY,
    PASSKIT_MEMBER_TEMPLATE_ID: !!process.env.PASSKIT_MEMBER_TEMPLATE_ID,
    PASSKIT_MEMBER_PLUS_TEMPLATE_ID: !!process.env.PASSKIT_MEMBER_PLUS_TEMPLATE_ID,
    PASSKIT_ELITE_TEMPLATE_ID: !!process.env.PASSKIT_ELITE_TEMPLATE_ID,
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  }
  console.log('[passkit/issue] Env vars present:', JSON.stringify(envCheck))
  console.log('[passkit/issue] Request body:', JSON.stringify(req.body))

  try {
    const { clerk_user_id, name, email, tier } = req.body || {}
    if (!clerk_user_id || !email || !tier) {
      console.log('[passkit/issue] Missing required fields')
      return res.status(400).json({ error: 'clerk_user_id, email, and tier are required' })
    }

    const apiKey = process.env.PASSKIT_API_KEY
    const templates = {
      'Member':  process.env.PASSKIT_MEMBER_TEMPLATE_ID,
      'Member+': process.env.PASSKIT_MEMBER_PLUS_TEMPLATE_ID,
      'Elite':   process.env.PASSKIT_ELITE_TEMPLATE_ID,
    }
    const resendKey = process.env.RESEND_API_KEY
    // Support both naming conventions for Supabase URL and service key
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    console.log('[passkit/issue] supabaseUrl resolved:', supabaseUrl ? 'YES' : 'NO')
    console.log('[passkit/issue] supabaseServiceKey resolved:', supabaseServiceKey ? 'YES' : 'NO')

    if (!apiKey) return res.status(500).json({ error: 'PASSKIT_API_KEY not configured' })
    if (!supabaseUrl) return res.status(500).json({ error: 'Supabase URL not configured (set VITE_SUPABASE_URL or SUPABASE_URL in Vercel)' })
    if (!supabaseServiceKey) return res.status(500).json({ error: 'Supabase service key not configured (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in Vercel)' })

    const templateId = templates[tier]
    if (!templateId) return res.status(500).json({ error: `No PassKit template configured for tier: ${tier}` })

    console.log('[passkit/issue] Step 1: Creating Supabase client')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[passkit/issue] Step 2: Looking up member, clerk_user_id:', clerk_user_id)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, joined_at')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (memberError) {
      console.error('[passkit/issue] Supabase member lookup error:', JSON.stringify(memberError))
      return res.status(404).json({ error: 'Member not found', detail: memberError.message })
    }
    if (!member) {
      console.error('[passkit/issue] No member row found for clerk_user_id:', clerk_user_id)
      return res.status(404).json({ error: 'Member not found' })
    }
    console.log('[passkit/issue] Member found: id=', member.id, 'joined_at=', member.joined_at)

    const joinedAt = member.joined_at ? new Date(member.joined_at) : new Date()
    const year = joinedAt.getFullYear()

    // members.id is a UUID — derive a short sequential position via count
    const { count: memberPos } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .lte('joined_at', member.joined_at)
    const memberId = `SUB-${year}-${String(memberPos || 1).padStart(5, '0')}`

    const expiry = new Date(joinedAt)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const expiryStr = expiry.toISOString().split('T')[0]

    console.log('[passkit/issue] Step 3: Calling PassKit API via https.request, templateId:', templateId, 'memberId:', memberId)
    const auth = Buffer.from(`${apiKey}:`).toString('base64')
    const passkitRes = await httpsPost(
      `https://api.passkit.io/v1/pass/issue/single/${encodeURIComponent(templateId)}`,
      { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      { dynamicData: { name: name || '', member_id: memberId, tier, expiry_date: expiryStr }, externalId: clerk_user_id }
    )

    console.log('[passkit/issue] PassKit response status:', passkitRes.status)
    if (!passkitRes.ok) {
      const errText = passkitRes.text()
      console.error('[passkit/issue] PassKit API error body:', errText)
      return res.status(500).json({ error: `PassKit API ${passkitRes.status}: ${errText}` })
    }

    const passData = passkitRes.json()
    console.log('[passkit/issue] PassKit response keys:', Object.keys(passData).join(', '))
    const passUrl = passData.url ?? passData.pass?.url ?? passData.passUrl ?? passData.walletUrl

    if (!passUrl) {
      console.error('[passkit/issue] No URL in PassKit response:', JSON.stringify(passData))
      return res.status(500).json({ error: `PassKit returned no URL. Response: ${JSON.stringify(passData)}` })
    }
    console.log('[passkit/issue] passUrl obtained successfully')

    console.log('[passkit/issue] Step 4: Storing passUrl in Supabase')
    const { error: updateError } = await supabase
      .from('members')
      .update({ passkit_pass_url: passUrl })
      .eq('clerk_user_id', clerk_user_id)
    if (updateError) {
      console.error('[passkit/issue] Supabase update error (non-fatal):', JSON.stringify(updateError))
    }

    if (resendKey) {
      console.log('[passkit/issue] Step 5: Sending welcome email to', email)
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
      if (!emailRes.ok) {
        console.error('[passkit/issue] Resend error:', await emailRes.text())
      } else {
        console.log('[passkit/issue] Email sent successfully')
      }
    } else {
      console.log('[passkit/issue] Step 5: Skipping email — RESEND_API_KEY not set')
    }

    console.log('[passkit/issue] Done — returning success')
    return res.status(200).json({ success: true, passUrl, memberId })

  } catch (err) {
    const cause = err?.cause?.message || err?.cause?.code || String(err?.cause || '')
    console.error('[passkit/issue] Unhandled exception:', err?.message, '| cause:', cause, '| stack:', err?.stack)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message, cause })
  }
}

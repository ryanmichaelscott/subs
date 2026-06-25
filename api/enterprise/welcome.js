export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name, email, plan } = req.body || {}
    if (!email) return res.status(400).json({ error: 'email is required' })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })

    const planLabel = { portfolio: 'Portfolio', professional: 'Professional', enterprise: 'Enterprise' }[plan] || 'Portfolio'
    const planColor = { portfolio: '#5DFF8A', professional: '#5B8DEF', enterprise: '#C084FC' }[plan] || '#5DFF8A'
    const firstName = name ? name.split(' ')[0] : null

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
          <table width="100%"><tr>
            <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
            <td align="right"><span style="background:${planColor}22;color:${planColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid ${planColor}44;display:inline-block;">Enterprise · ${planLabel}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 16px;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EEE8;line-height:1.2;">Welcome to SUBS${firstName ? `, ${firstName}` : ''}.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8A9088;line-height:1.7;">Your portfolio membership is active. You now have access to member pricing on every trade across your entire portfolio. Your team will reach out within one business day to get you fully set up.</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <div style="background:#141814;border:1px solid #252A23;border-left:3px solid #5DFF8A;border-radius:8px;padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">What's next</p>
            <p style="margin:0;font-size:13px;color:#F0EEE8;line-height:1.6;">Add your properties in the dashboard, then submit your first job request. We'll match you with a vetted contractor at member rates.</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <a href="https://subs.app/enterprise/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:8px;text-decoration:none;">Go to my dashboard →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
          <p style="margin:0;font-size:12px;color:#8A9088;">Questions? Call or text <a href="tel:18884543019" style="color:#8A9088;">1-888-454-3019</a> or reply to this email</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SUBS <hello@subs.app>',
        to: email,
        subject: `Welcome to SUBS — your portfolio membership is active`,
        html,
      }),
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[enterprise/welcome] error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}

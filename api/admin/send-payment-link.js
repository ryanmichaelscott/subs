export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email, name, checkout_url, tier_label } = req.body || {}
    if (!email || !checkout_url) return res.status(400).json({ error: 'email and checkout_url required' })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })

    const firstName = (name || '').split(' ')[0] || 'there'
    const subject = tier_label
      ? `Your SUBS ${tier_label} membership — complete your setup`
      : 'Your SUBS membership — complete your setup'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SUBS <hello@subs.app>',
        to: email,
        subject,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0C0F0A;color:#F0EEE8;padding:32px;border-radius:12px">
          <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:4px">SUBS</div>
          <h2 style="font-size:20px;margin:16px 0 8px">Hi ${firstName}, you're almost in.</h2>
          <p style="color:#8A9088;font-size:14px;line-height:1.6">Your SUBS account has been created${tier_label ? ` for the ${tier_label} plan` : ''}. Click below to complete your membership.</p>
          <a href="${checkout_url}" style="display:inline-block;margin-top:20px;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Complete Membership →</a>
          <p style="color:#8A9088;font-size:12px;margin-top:24px">Questions? Reply to this email or text us.</p>
        </div>`,
      }),
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[admin/send-payment-link] error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}

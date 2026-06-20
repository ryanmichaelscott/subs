import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { full_name, email, phone, company_name, unit_count, monthly_spend, message } = req.body || {}
    if (!full_name || !email || !company_name) {
      return res.status(400).json({ error: 'full_name, email, and company_name are required' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendKey   = process.env.RESEND_API_KEY

    // Save lead to DB
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase.from('enterprise_leads').insert({
        full_name, email, phone, company_name, unit_count, monthly_spend, message,
      })
    }

    // Notify ryan@skscott.com via Resend
    if (resendKey) {
      const subject = `New Enterprise Inquiry — ${company_name} — ${unit_count || '?'} units`
      const html = `
        <div style="font-family:sans-serif;background:#0C0F0A;padding:32px;color:#F0EEE8;max-width:600px;margin:0 auto;">
          <div style="font-size:18px;font-weight:800;color:#5DFF8A;margin-bottom:16px;">SUBS — New Enterprise Inquiry</div>
          <table style="width:100%;border-collapse:collapse;">
            ${[
              ['Name', full_name],
              ['Email', email],
              ['Phone', phone || '—'],
              ['Company', company_name],
              ['Units', unit_count || '—'],
              ['Monthly Spend', monthly_spend || '—'],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 12px;font-size:12px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:.08em;width:160px;border-bottom:1px solid #252A23;">${label}</td>
                <td style="padding:10px 12px;font-size:14px;color:#F0EEE8;border-bottom:1px solid #252A23;">${value}</td>
              </tr>
            `).join('')}
          </table>
          ${message ? `<div style="margin-top:16px;background:#141814;border:1px solid #252A23;border-left:3px solid #5DFF8A;padding:14px 16px;border-radius:8px;font-size:13px;color:#F0EEE8;line-height:1.6;">${message}</div>` : ''}
        </div>
      `
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: 'support@subs.app',
          subject,
          html,
        }),
      })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[enterprise/lead] error:', err?.message)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message })
  }
}

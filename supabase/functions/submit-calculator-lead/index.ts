import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORT_EMAIL = 'support@subs.app'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith('1')) return formatPhone(digits.slice(1))
  return phone
}

function leadEmailHtml(lead: {
  firstName: string
  phone: string
  ownsHome: boolean | null
  trade: string
  service: string
  stateName: string
  retail: number
  member: number
  savings: number
}): string {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Denver', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
  const ownsHomeLabel = lead.ownsHome === true ? 'Yes' : lead.ownsHome === false ? 'No' : 'Not answered'
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #252A23;color:#8A9088;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;width:160px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #252A23;color:#F0EEE8;font-size:15px;vertical-align:top;">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #252A23;">
          <div style="font-size:12px;font-weight:700;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">New Calculator Lead</div>
          <div style="font-size:24px;color:#F0EEE8;font-weight:400;">${esc(lead.firstName)} wants their member pricing locked in</div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', esc(lead.firstName))}
            ${row('Phone', `<a href="tel:${esc(lead.phone.replace(/\D/g, ''))}" style="color:#5DFF8A;text-decoration:none;">${esc(formatPhone(lead.phone))}</a>`)}
            ${row('Owns home?', ownsHomeLabel)}
            ${row('Trade', esc(lead.trade))}
            ${row('Service needed', esc(lead.service))}
            ${row('State', esc(lead.stateName))}
            ${row('Retail price', `$${lead.retail.toLocaleString()}`)}
            ${row('Member price', `$${lead.member.toLocaleString()}`)}
            ${row('Est. savings', `<span style="color:#5DFF8A;font-weight:700;">$${lead.savings.toLocaleString()}</span>`)}
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <div style="background:#0A1C0E;border:1px solid #5DFF8A44;border-radius:10px;padding:16px 18px;color:#8A9088;font-size:13px;line-height:1.6;">
            Lead the call with <strong style="color:#F0EEE8;">${esc(lead.service)}</strong> — they already saw they'd save
            <strong style="color:#5DFF8A;">$${lead.savings.toLocaleString()}</strong> vs. retail on the calculator.
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#0C0F0A;border-top:1px solid #252A23;">
          <span style="font-size:12px;color:#6B7268;">Source: calculator_lead · ${now} MT</span>
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
    const body = await req.json()
    const { ownsHome, trade, service, stateCode, stateName } = body
    const firstName = String(body.firstName ?? '').trim().slice(0, 100)
    const phone = String(body.phone ?? '').trim().slice(0, 30)
    const retail = Number(body.retail) || 0
    const member = Number(body.member) || 0
    const savings = Number(body.savings) || 0

    // Honeypot — bots fill every field; humans never see this one
    if (body.website) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!firstName || !phone) {
      return new Response(JSON.stringify({ error: 'firstName and phone are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      return new Response(JSON.stringify({ error: 'Please enter a valid phone number' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: insertError } = await supabase.from('marketing_leads').insert({
      source: 'calculator_lead',
      first_name: firstName,
      phone,
      owns_home: typeof ownsHome === 'boolean' ? ownsHome : null,
      trade: trade ? String(trade).slice(0, 100) : null,
      service: service ? String(service).slice(0, 200) : null,
      state: stateCode ? String(stateCode).slice(0, 10) : null,
      retail_price: retail || null,
      member_price: member || null,
      estimated_savings: savings || null,
    })

    if (insertError) throw insertError

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_KEY) {
      const subjectService = String(service || trade || 'calculator').replace(/[\r\n]/g, ' ').slice(0, 80)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: SUPPORT_EMAIL,
          subject: `New lead: ${firstName.replace(/[\r\n]/g, ' ')} — ${subjectService} ($${savings.toLocaleString()} savings)`,
          html: leadEmailHtml({
            firstName, phone, ownsHome: typeof ownsHome === 'boolean' ? ownsHome : null,
            trade: trade || '—', service: service || '—', stateName: stateName || stateCode || '—',
            retail, member, savings,
          }),
        }),
      })
      if (!res.ok) console.error('Resend error (submit-calculator-lead):', await res.text())
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('submit-calculator-lead error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

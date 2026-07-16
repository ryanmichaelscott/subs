import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORT_EMAIL = 'support@subs.app'
const CHECKLIST_URL = 'https://www.subs.app/utah-homeowner-checklist.pdf'

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
  email: string
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
      <td style="padding:10px 0;border-bottom:1px solid #DCD3BF;color:#6A7466;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;width:160px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #DCD3BF;color:#1E2A23;font-size:15px;vertical-align:top;">${value}</td>
    </tr>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3E9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFDF7;border:1px solid #DCD3BF;border-radius:14px;overflow:hidden;max-width:560px;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #DCD3BF;">
          <div style="font-size:12px;font-weight:700;color:#175A41;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">New Calculator Lead</div>
          <div style="font-size:24px;color:#1E2A23;font-weight:400;">${esc(lead.firstName)} wants their member pricing locked in</div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', esc(lead.firstName))}
            ${row('Phone', `<a href="tel:${esc(lead.phone.replace(/\D/g, ''))}" style="color:#175A41;text-decoration:none;">${esc(formatPhone(lead.phone))}</a>`)}
            ${row('Email', lead.email ? `<a href="mailto:${esc(lead.email)}" style="color:#175A41;text-decoration:none;">${esc(lead.email)}</a>` : '—')}
            ${row('Owns home?', ownsHomeLabel)}
            ${row('Trade', esc(lead.trade))}
            ${row('Service needed', esc(lead.service))}
            ${row('State', esc(lead.stateName))}
            ${row('Retail price', `$${lead.retail.toLocaleString()}`)}
            ${row('Member price', `$${lead.member.toLocaleString()}`)}
            ${row('Est. savings', `<span style="color:#175A41;font-weight:700;">$${lead.savings.toLocaleString()}</span>`)}
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <div style="background:#E7EFE0;border:1px solid #175A4144;border-radius:10px;padding:16px 18px;color:#6A7466;font-size:13px;line-height:1.6;">
            Lead the call with <strong style="color:#1E2A23;">${esc(lead.service)}</strong> — they already saw they'd save
            <strong style="color:#175A41;">$${lead.savings.toLocaleString()}</strong> vs. retail on the calculator.
            They've also been emailed the free maintenance checklist.
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#F7F3E9;border-top:1px solid #DCD3BF;">
          <span style="font-size:12px;color:#8A9080;">Source: calculator_lead · ${now} MT</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function checklistEmailHtml(firstName: string): string {
  const name = esc(firstName || 'there')
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your free Utah Homeowner's Maintenance Checklist</title></head>
<body style="margin:0;padding:0;background:#F7F3E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3E9;">
    <tr><td align="center" style="padding:40px 16px 48px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr><td style="padding-bottom:24px;">
          <div style="font-size:20px;font-weight:800;color:#175A41;letter-spacing:0.08em;">SUBS</div>
          <div style="height:1px;background:#DCD3BF;margin-top:14px;"></div>
        </td></tr>

        <tr><td style="padding-bottom:28px;">
          <div style="font-size:12px;font-weight:700;color:#175A41;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">🎁 Your free gift</div>
          <h1 style="font-size:28px;font-weight:800;color:#1E2A23;margin:0 0 14px;line-height:1.2;">Here's your checklist, ${name}.</h1>
          <p style="font-size:14px;color:#6A7466;line-height:1.7;margin:0;">
            As promised — <strong style="color:#1E2A23;">The Utah Homeowner's Annual Maintenance Checklist</strong> is attached.
            It's 27 tasks across all four seasons that prevent $10,000+ in emergency repairs, with average Utah retail pricing
            next to what SUBS members pay for the same work.
          </p>
        </td></tr>

        <tr><td style="padding-bottom:28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF7;border:1px solid #DCD3BF;border-radius:14px;">
            <tr><td style="padding:24px 28px;">
              <div style="font-size:15px;font-weight:700;color:#1E2A23;margin-bottom:6px;">📎 Utah Homeowner's Annual Maintenance Checklist</div>
              <div style="font-size:13px;color:#6A7466;line-height:1.6;margin-bottom:18px;">Attached as a PDF — or grab it any time with the button below. Print it, stick it on the fridge, and check tasks off as the seasons turn.</div>
              <a href="${CHECKLIST_URL}" style="display:inline-block;background:#175A41;color:#F7F3E9;font-size:14px;font-weight:800;padding:12px 26px;border-radius:10px;text-decoration:none;">Download the checklist →</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding-bottom:32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#E7EFE0;border:1px solid #C9DCC0;border-radius:14px;">
            <tr><td style="padding:24px 28px;">
              <div style="font-size:11px;font-weight:800;color:#175A41;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">What happens next</div>
              <p style="font-size:13px;color:#6A7466;line-height:1.7;margin:0;">
                Our concierge team will call or text you shortly to confirm your member pricing on the service you picked.
                The average Utah homeowner saves <strong style="color:#175A41;">$1,200–$2,000+/year</strong> on the routine
                maintenance in this checklist alone — and membership starts at $99/year.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td>
          <div style="font-size:12px;color:#6A7466;line-height:1.8;">
            Questions? Call or text <span style="color:#1E2A23;">1-888-454-3019</span> or visit <a href="https://www.subs.app" style="color:#175A41;text-decoration:none;">subs.app</a><br>
            You're receiving this because you requested your member pricing at subs.app/calculator.<br>
            <span style="color:#9AA392;">© ${new Date().getFullYear()} SUBS. All rights reserved.</span>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Fetch the hosted PDF and return it base64-encoded for a Resend attachment.
// If the fetch fails for any reason, the email still goes out with the
// download button only — never block the checklist send on the attachment.
async function fetchChecklistAttachment(): Promise<{ filename: string; content: string } | null> {
  try {
    const res = await fetch(CHECKLIST_URL)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    // The site's SPA rewrite serves index.html with a 200 for unknown paths —
    // verify PDF magic bytes so we never attach an HTML page as "the checklist"
    if (buf.length < 4 || String.fromCharCode(...buf.subarray(0, 4)) !== '%PDF') {
      console.error('checklist fetch returned non-PDF content, skipping attachment')
      return null
    }
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk))
    }
    return { filename: 'Utah-Homeowner-Annual-Maintenance-Checklist.pdf', content: btoa(binary) }
  } catch (err) {
    console.error('checklist attachment fetch failed:', err)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { ownsHome, trade, service, stateCode, stateName } = body
    const firstName = String(body.firstName ?? '').trim().slice(0, 100)
    const phone = String(body.phone ?? '').trim().slice(0, 30)
    const email = String(body.email ?? '').trim().slice(0, 200)
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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address' }), {
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
      email,
      owns_home: typeof ownsHome === 'boolean' ? ownsHome : null,
      trade: trade ? String(trade).slice(0, 100) : null,
      service: service ? String(service).slice(0, 200) : null,
      state: stateCode ? String(stateCode).slice(0, 10) : null,
      retail_price: retail || null,
      member_price: member || null,
      estimated_savings: savings || null,
    })

    if (insertError) throw insertError

    let checklistSent = false
    let checklistAttached = false
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_KEY) {
      // 1. Checklist gift to the lead (PDF attached when fetchable)
      const attachment = await fetchChecklistAttachment()
      checklistAttached = !!attachment
      const giftRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: email,
          subject: "Your free Utah Homeowner's Maintenance Checklist 🎁",
          html: checklistEmailHtml(firstName),
          ...(attachment ? { attachments: [attachment] } : {}),
        }),
      })
      checklistSent = giftRes.ok
      if (!giftRes.ok) console.error('Resend error (checklist gift):', await giftRes.text())

      // 2. Lead notification to support
      const subjectService = String(service || trade || 'calculator').replace(/[\r\n]/g, ' ').slice(0, 80)
      const notifyRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: SUPPORT_EMAIL,
          subject: `New lead: ${firstName.replace(/[\r\n]/g, ' ')} — ${subjectService} ($${savings.toLocaleString()} savings)`,
          html: leadEmailHtml({
            firstName, phone, email, ownsHome: typeof ownsHome === 'boolean' ? ownsHome : null,
            trade: trade || '—', service: service || '—', stateName: stateName || stateCode || '—',
            retail, member, savings,
          }),
        }),
      })
      if (!notifyRes.ok) console.error('Resend error (support notification):', await notifyRes.text())
    }

    return new Response(JSON.stringify({ success: true, checklistSent, checklistAttached }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('submit-calculator-lead error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

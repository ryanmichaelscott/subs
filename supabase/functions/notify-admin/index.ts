import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatPhone(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')
  const toFormatted = formatPhone(to)
  if (!sid || !auth || !from || !toFormatted) return
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${auth}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body }).toString(),
  })
  if (!res.ok) console.error('Twilio error:', res.status, await res.text())
}

function tierBadgeColor(tier: string): string {
  if (tier === 'Elite') return '#F5A623'
  if (tier === 'Member+') return '#5B8DEF'
  return '#5DFF8A'
}

function memberEmailHtml(name: string, email: string, tier: string): string {
  const badgeColor = tierBadgeColor(tier)
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;">

        <!-- Header -->
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
              <td align="right"><span style="display:inline-block;background:${badgeColor}22;color:${badgeColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid ${badgeColor}44;">${tier}</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#F0EEE8;line-height:1.2;">New member signup</p>
          <p style="margin:0 0 28px;font-size:13px;color:#8A9088;">${now} MT</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#141814;border:1px solid #252A23;border-radius:10px;overflow:hidden;">
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;width:100px;">Name</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${name || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Email</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${email}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Plan</td>
              <td style="padding:12px 16px;font-size:14px;color:${badgeColor};font-weight:700;">${tier}</td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <a href="https://getsubs.co/admin/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">View Admin Dashboard →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
          <p style="margin:0;font-size:12px;color:#8A9088;">SUBS internal notification · <a href="https://subs.app" style="color:#8A9088;">subs.app</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function contractorEmailHtml(companyName: string, contactName: string, email: string, phone: string, trades: string[]): string {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  const tradeList = (trades || []).join(', ') || '—'
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;">

        <!-- Header -->
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
              <td align="right"><span style="display:inline-block;background:#F5A62322;color:#F5A623;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid #F5A62344;">Contractor</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#F0EEE8;line-height:1.2;">New contractor application</p>
          <p style="margin:0 0 28px;font-size:13px;color:#8A9088;">${now} MT</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#141814;border:1px solid #252A23;border-radius:10px;overflow:hidden;">
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;width:110px;">Company</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;font-weight:600;">${companyName}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Contact</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${contactName || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Email</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${email}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Phone</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${phone || '—'}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">Trades</td>
              <td style="padding:12px 16px;font-size:14px;color:#5DFF8A;">${tradeList}</td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <a href="https://getsubs.co/admin/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Review Application →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
          <p style="margin:0;font-size:12px;color:#8A9088;">SUBS internal notification · <a href="https://subs.app" style="color:#8A9088;">subs.app</a></p>
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
    const { type, name, email, phone, tier, trades, company_name } = await req.json()

    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const adminPhone = Deno.env.get('ADMIN_PHONE')
    const resendKey = Deno.env.get('RESEND_API_KEY')

    let subject: string
    let html: string
    let smsBody: string

    if (type === 'member') {
      subject = `New ${tier} signup — ${email}`
      html = memberEmailHtml(name || '', email, tier || 'Member')
      smsBody = `SUBS: New ${tier} signup — ${name ? name + ' · ' : ''}${email}`
    } else if (type === 'contractor') {
      subject = `New contractor application — ${company_name || email}`
      html = contractorEmailHtml(company_name || '', name || '', email, phone || '', trades || [])
      smsBody = `SUBS: New contractor application — ${company_name || email}${trades?.length ? ' (' + trades.slice(0, 2).join(', ') + ')' : ''}`
    } else {
      return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Send email
    if (adminEmail && resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'SUBS <hello@subs.app>', to: [adminEmail], subject, html }),
      })
    }

    // Send SMS
    if (adminPhone) {
      await sendSms(adminPhone, smsBody)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('notify-admin error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

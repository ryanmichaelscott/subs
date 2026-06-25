import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${auth}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body, StatusCallback: 'https://subs.app/api/twilio/status' }).toString(),
  })
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { trade, description, zip, state, preferred_date, member_email, member_name, clerk_user_id } = await req.json()

    if (!trade || !zip || !member_email) {
      return new Response(JSON.stringify({ error: 'trade, zip, and member_email are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: lead, error: leadError } = await supabase
      .from('job_requests')
      .insert({
        clerk_user_id: clerk_user_id || '',
        trade,
        description: description || '',
        zip,
        state: state || '',
        preferred_date: preferred_date || null,
        member_email,
        member_name: member_name || '',
        status: 'open',
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (leadError) throw new Error(leadError.message)

    // Find active contractors with matching trade and state
    const { data: contractors } = await supabase
      .from('contractors')
      .select('id, name, trade, trades, contact_email, contact_name, phone, service_area')
      .eq('status', 'active')

    const matched = (contractors || []).filter(c => {
      const trades = Array.isArray(c.trades) && c.trades.length ? c.trades : [c.trade].filter(Boolean)
      if (!trades.includes(trade)) return false

      // No state on the request → match any contractor
      if (!state) return true

      let sa = c.service_area
      if (typeof sa === 'string') { try { sa = JSON.parse(sa) } catch { return true } }
      // No service_area set → match any state
      if (!sa) return true
      // service_area has no state set → match any state (e.g. radius-only config)
      if (!sa.state) return true

      return sa.state === state
    })

    console.log(`create-lead: trade=${trade} state=${state} active=${contractors?.length ?? 0} matched=${matched.length}`)

    if (matched.length === 0) {
      return new Response(JSON.stringify({ success: true, lead_id: lead.id, contractor_count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create notifications for each matched contractor
    const notifications = matched.map(c => ({
      job_request_id: lead.id,
      contractor_id: c.id,
      status: 'pending',
    }))

    await supabase.from('lead_notifications').insert(notifications)

    // Email each contractor
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'

    if (resendKey) {
      const preferredDateStr = preferred_date
        ? new Date(preferred_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Flexible'

      await Promise.all(matched.map(async (c) => {
        const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0C0F0A;color:#F0EEE8;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    <h1 style="font-size:26px;font-weight:700;color:#F0EEE8;margin:0 0 8px;line-height:1.2;">
      New lead: ${trade}
    </h1>
    <p style="font-size:13px;color:#8A9088;margin:0 0 28px;">Zip ${zip}${state ? ` · ${state}` : ''} · Expires in 24 hours</p>

    <div style="background:#141814;border:1px solid #252A23;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Trade</div>
        <div style="font-size:15px;font-weight:700;color:#F0EEE8;">${trade}</div>
      </div>
      ${description ? `
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Description</div>
        <div style="font-size:14px;color:#F0EEE8;line-height:1.5;">${description}</div>
      </div>` : ''}
      <div style="display:flex;gap:24px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Zip</div>
          <div style="font-size:14px;color:#F0EEE8;">${zip}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Preferred Date</div>
          <div style="font-size:14px;color:#F0EEE8;">${preferredDateStr}</div>
        </div>
      </div>
    </div>

    <a href="${appUrl}/contractor/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      View &amp; Accept Lead →
    </a>

    <p style="font-size:12px;color:#8A9088;line-height:1.6;margin:0 0 8px;">
      Log in to your dashboard to accept or decline. First contractor to accept gets the job.
    </p>
    <p style="font-size:12px;color:#8A9088;margin-top:24px;">
      Questions? <a href="mailto:partners@subs.app" style="color:#5DFF8A;text-decoration:none;">partners@subs.app</a>
    </p>
  </div>
</body>
</html>`

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SUBS <hello@subs.app>',
            to: c.contact_email,
            subject: `New SUBS lead: ${trade} · Zip ${zip}`,
            html,
          }),
        })
      }))
    }

    // SMS each matched contractor
    await Promise.all(matched.map(c => {
      if (!c.phone) return Promise.resolve()
      const msg = `New SUBS lead: ${trade} · Zip ${zip}${state ? `, ${state}` : ''}. Log in to accept: https://subs.app/contractor/dashboard\n\nQuestions? Call or text 1-888-454-3019 or visit subs.app\n\nReply STOP to opt out.`
      return sendSms(c.phone, msg)
    }))

    return new Response(
      JSON.stringify({ success: true, lead_id: lead.id, contractor_count: matched.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('create-lead error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

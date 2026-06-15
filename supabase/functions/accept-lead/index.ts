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
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body }).toString(),
  })
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { job_request_id, contractor_id } = await req.json()

    if (!job_request_id || !contractor_id) {
      return new Response(JSON.stringify({ error: 'job_request_id and contractor_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Atomically claim the lead — only succeeds if still open
    const { data: updated, error: updateError } = await supabase
      .from('job_requests')
      .update({ status: 'accepted', accepted_contractor_id: contractor_id })
      .eq('id', job_request_id)
      .eq('status', 'open')
      .select()
      .single()

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: 'Lead is no longer available.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark this contractor's notification as accepted
    await supabase
      .from('lead_notifications')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('job_request_id', job_request_id)
      .eq('contractor_id', contractor_id)

    // Expire all other pending notifications for this lead
    await supabase
      .from('lead_notifications')
      .update({ status: 'expired' })
      .eq('job_request_id', job_request_id)
      .eq('status', 'pending')
      .neq('contractor_id', contractor_id)

    // Fetch contractor details to send to member
    const { data: contractor } = await supabase
      .from('contractors')
      .select('name, contact_name, contact_email, phone, trade, trades')
      .eq('id', contractor_id)
      .single()

    // Email the member
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'

    if (resendKey && updated.member_email && contractor) {
      const contractorPhone = contractor.phone || ''
      const contractorName = contractor.name || contractor.contact_name || 'Your SUBS contractor'
      const memberName = updated.member_name ? ` ${updated.member_name}` : ''

      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0C0F0A;color:#F0EEE8;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    <h1 style="font-size:26px;font-weight:700;color:#F0EEE8;margin:0 0 8px;line-height:1.2;">
      Your contractor is confirmed.
    </h1>
    <p style="font-size:14px;color:#8A9088;line-height:1.7;margin:0 0 28px;">
      Hey${memberName} — a vetted SUBS partner has accepted your ${updated.trade} request. They'll reach out shortly to schedule.
    </p>

    <div style="background:#141814;border:1px solid #252A23;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:700;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:16px;">YOUR CONTRACTOR</div>
      <div style="font-size:18px;font-weight:700;color:#F0EEE8;margin-bottom:4px;">${contractorName}</div>
      <div style="font-size:13px;color:#8A9088;margin-bottom:${contractorPhone ? '16px' : '0'};">${updated.trade} · SUBS Verified Partner</div>
      ${contractorPhone ? `<a href="tel:${contractorPhone}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:10px 20px;border-radius:8px;text-decoration:none;">Call ${contractorPhone}</a>` : ''}
    </div>

    <p style="font-size:13px;color:#8A9088;line-height:1.6;margin:0 0 8px;">
      Your member rate is guaranteed. If you have any issues, contact us at <a href="mailto:hello@subs.app" style="color:#5DFF8A;text-decoration:none;">hello@subs.app</a>.
    </p>
    <a href="${appUrl}/dashboard" style="display:inline-block;margin-top:20px;font-size:13px;font-weight:600;color:#5DFF8A;text-decoration:none;">View your dashboard →</a>
  </div>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: updated.member_email,
          subject: `Your ${updated.trade} contractor is confirmed — ${contractorName}`,
          html,
        }),
      })
    }

    // SMS the member
    if (updated.clerk_user_id && contractor) {
      const { data: member } = await supabase
        .from('members')
        .select('phone')
        .eq('clerk_user_id', updated.clerk_user_id)
        .single()

      if (member?.phone) {
        const contractorName = contractor.name || contractor.contact_name || 'Your contractor'
        const msg = `Your SUBS contractor is confirmed — ${contractorName} accepted your ${updated.trade} request. They'll be in touch shortly. subs.app/dashboard`
        await sendSms(member.phone, msg)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('accept-lead error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

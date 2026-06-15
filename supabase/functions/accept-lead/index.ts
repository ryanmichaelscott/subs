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
  if (!sid || !auth || !from || !toFormatted) {
    console.log('SMS skipped — missing config or invalid phone:', { sid: !!sid, auth: !!auth, from: !!from, toFormatted })
    return
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${sid}:${auth}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Twilio SMS error:', res.status, err)
  }
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

    // Fetch contractor details
    const { data: contractor } = await supabase
      .from('contractors')
      .select('name, contact_name, contact_email, phone, trade, trades')
      .eq('id', contractor_id)
      .single()

    // Fetch member phone (for SMS to member)
    let memberPhone: string | null = null
    if (updated.clerk_user_id) {
      const { data: member } = await supabase
        .from('members')
        .select('phone')
        .eq('clerk_user_id', updated.clerk_user_id)
        .single()
      memberPhone = member?.phone || null
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://getsubs.co'
    const contractorName = contractor?.name || contractor?.contact_name || 'Your SUBS contractor'
    const contractorPhone = contractor?.phone || ''
    const contractorEmail = contractor?.contact_email || ''
    const memberName = updated.member_name || 'SUBS Member'
    const memberEmail = updated.member_email || ''
    const trade = updated.trade || 'your requested service'

    // Email the member with contractor contact info
    if (resendKey && memberEmail && contractor) {
      const memberHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0C0F0A;color:#F0EEE8;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    <h1 style="font-size:26px;font-weight:700;color:#F0EEE8;margin:0 0 8px;line-height:1.2;">
      Your contractor is confirmed.
    </h1>
    <p style="font-size:14px;color:#8A9088;line-height:1.7;margin:0 0 28px;">
      Hey ${memberName} — a vetted SUBS partner has accepted your ${trade} request. They'll reach out shortly to schedule.
    </p>
    <div style="background:#141814;border:1px solid #252A23;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:700;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:16px;">YOUR CONTRACTOR</div>
      <div style="font-size:18px;font-weight:700;color:#F0EEE8;margin-bottom:4px;">${contractorName}</div>
      <div style="font-size:13px;color:#8A9088;margin-bottom:16px;">${trade} · SUBS Verified Partner</div>
      ${contractorPhone ? `<a href="tel:${contractorPhone}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:10px 20px;border-radius:8px;text-decoration:none;margin-right:10px;">Call ${contractorPhone}</a>` : ''}
      ${contractorEmail ? `<a href="mailto:${contractorEmail}" style="display:inline-block;background:transparent;border:1px solid #5DFF8A;color:#5DFF8A;font-weight:600;font-size:14px;padding:9px 20px;border-radius:8px;text-decoration:none;">Email</a>` : ''}
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
          to: memberEmail,
          subject: `Your ${trade} contractor is confirmed — ${contractorName}`,
          html: memberHtml,
        }),
      })
    }

    // Email the contractor with member contact info
    if (resendKey && contractorEmail && updated) {
      const contractorHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#f5f5f5;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
    <div style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:0.06em;margin-bottom:28px;">SUBS</div>
    <div style="display:inline-block;background:#D1FAE5;color:#065F46;font-size:12px;font-weight:700;padding:4px 12px;border-radius:100px;margin-bottom:20px;letter-spacing:0.06em;">
      LEAD CONFIRMED
    </div>
    <p style="font-size:16px;color:#1a1a1a;margin-bottom:20px;">Hi ${contractorName},</p>
    <p style="font-size:15px;color:#555;line-height:1.6;margin-bottom:24px;">
      You've claimed this lead. Here is the member's contact information — reach out to schedule the job.
    </p>
    <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:10px;padding:20px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:700;color:#16a34a;letter-spacing:0.06em;margin-bottom:14px;">MEMBER CONTACT</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:12px;color:#999;padding:6px 0;width:100px;">Name</td>
          <td style="font-size:14px;color:#1a1a1a;font-weight:600;padding:6px 0;">${memberName}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#999;padding:6px 0;">Service</td>
          <td style="font-size:14px;color:#1a1a1a;font-weight:600;padding:6px 0;">${trade}</td>
        </tr>
        ${memberPhone ? `<tr>
          <td style="font-size:12px;color:#999;padding:6px 0;">Phone</td>
          <td style="font-size:14px;padding:6px 0;"><a href="tel:${memberPhone}" style="color:#16a34a;font-weight:700;text-decoration:none;">${memberPhone}</a></td>
        </tr>` : ''}
        ${memberEmail ? `<tr>
          <td style="font-size:12px;color:#999;padding:6px 0;">Email</td>
          <td style="font-size:14px;padding:6px 0;"><a href="mailto:${memberEmail}" style="color:#16a34a;text-decoration:none;">${memberEmail}</a></td>
        </tr>` : ''}
        ${updated.zip ? `<tr>
          <td style="font-size:12px;color:#999;padding:6px 0;">Location</td>
          <td style="font-size:14px;color:#1a1a1a;padding:6px 0;">Zip ${updated.zip}${updated.state ? `, ${updated.state}` : ''}</td>
        </tr>` : ''}
      </table>
    </div>
    <a href="${appUrl}/contractor/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:15px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
      View in portal →
    </a>
    <p style="font-size:13px;color:#999;margin-top:32px;line-height:1.5;">— The SUBS Team</p>
  </div>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: contractorEmail,
          subject: `Lead confirmed — ${memberName} · ${trade}`,
          html: contractorHtml,
        }),
      })
    }

    // SMS the member
    if (memberPhone) {
      const msg = `Your SUBS contractor is confirmed — ${contractorName} accepted your ${trade} request.${contractorPhone ? ` Their number: ${contractorPhone}` : ''} They'll be in touch shortly.`
      await sendSms(memberPhone, msg)
    }

    // SMS the contractor
    if (contractorPhone) {
      const msg = `SUBS: You accepted the ${trade} lead.${memberPhone ? ` Member contact: ${memberName}, ${memberPhone}` : ` Member: ${memberName}`}. Check your email for full details.`
      await sendSms(contractorPhone, msg)
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

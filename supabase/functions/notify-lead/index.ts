import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
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
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')
  const toFormatted = formatPhone(to)
  if (!sid || !token || !from || !toFormatted) {
    console.log('SMS skipped — missing config or invalid phone:', { sid: !!sid, token: !!token, from: !!from, toFormatted })
    return
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body, StatusCallback: 'https://getsubs.co/api/twilio/status' }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Twilio SMS error:', res.status, err)
  }
}

const leadEmail = (contractorName: string, lead: {
  member: string
  address: string
  service: string
  rate: string
  tier: string
  date: string
}) => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, system-ui, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px;">
    <div style="font-size: 22px; font-weight: 800; color: #1a1a1a; letter-spacing: 0.06em; margin-bottom: 28px;">SUBS</div>
    <div style="display: inline-block; background: #FFF3CD; color: #856404; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 100px; margin-bottom: 20px; letter-spacing: 0.06em;">
      NEW LEAD
    </div>
    <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 20px;">Hi ${contractorName},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
      A SUBS member has requested your service. Log into your partner portal to accept or decline — leads expire if not responded to within 8 hours.
    </p>
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 12px; color: #999; padding: 6px 0; width: 120px;">Member</td>
          <td style="font-size: 14px; color: #1a1a1a; font-weight: 600; padding: 6px 0;">${lead.member}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #999; padding: 6px 0;">Service</td>
          <td style="font-size: 14px; color: #1a1a1a; font-weight: 600; padding: 6px 0;">${lead.service}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #999; padding: 6px 0;">Location</td>
          <td style="font-size: 14px; color: #1a1a1a; padding: 6px 0;">${lead.address}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #999; padding: 6px 0;">Member Rate</td>
          <td style="font-size: 15px; color: #16a34a; font-weight: 700; padding: 6px 0;">${lead.rate}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #999; padding: 6px 0;">Tier</td>
          <td style="font-size: 14px; color: #1a1a1a; padding: 6px 0;">${lead.tier}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #999; padding: 6px 0;">Requested</td>
          <td style="font-size: 14px; color: #1a1a1a; padding: 6px 0;">${lead.date}</td>
        </tr>
      </table>
    </div>
    <a href="https://getsubs.co/contractor/dashboard" style="display: inline-block; background: #5DFF8A; color: #0C0F0A; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
      View lead in portal →
    </a>
    <p style="font-size: 13px; color: #999; margin-top: 32px; line-height: 1.5;">
      If you can't take this job, decline in the portal so we can route it to another partner. Repeated non-responses may affect your lead priority.
    </p>
    <p style="font-size: 15px; color: #1a1a1a; margin-top: 8px;">— The SUBS Team</p>
  </div>
</body>
</html>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const body = await req.json()

  // Accept either a full lead object or a lead_id to look up
  let contractorEmail: string
  let contractorName: string
  let lead: any

  let contractorPhone: string | null = null

  if (body.lead_id) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: leadRow, error } = await supabase
      .from('leads')
      .select('*, contractors(name, contact_name, contact_email, phone)')
      .eq('id', body.lead_id)
      .single()

    if (error || !leadRow) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    contractorEmail = leadRow.contractors.contact_email
    contractorName = leadRow.contractors.name
    contractorPhone = leadRow.contractors.phone || null
    lead = {
      member: leadRow.member_name || 'SUBS Member',
      address: leadRow.address || leadRow.zip || '—',
      service: leadRow.service || '—',
      rate: leadRow.rate || '—',
      tier: leadRow.member_tier || '—',
      date: new Date(leadRow.dispatched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
  } else {
    // Accept inline payload: { contractor_email, contractor_name, contractor_phone, lead: {...} }
    contractorEmail = body.contractor_email
    contractorName = body.contractor_name || 'Partner'
    contractorPhone = body.contractor_phone || null
    lead = body.lead
  }

  if (!contractorEmail || !lead) {
    return new Response(JSON.stringify({ error: 'contractor_email and lead are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SUBS <hello@subs.app>',
      to: contractorEmail,
      subject: `New SUBS lead — ${lead.service}`,
      html: leadEmail(contractorName, lead),
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // SMS to contractor
  if (contractorPhone) {
    await sendSms(
      contractorPhone,
      `SUBS: New lead — ${lead.service} in ${lead.address}. Member rate: ${lead.rate}. Log in to accept: https://getsubs.co/contractor/dashboard\n\nQuestions? Call or text 1-888-454-3019 or visit subs.app`,
    )
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

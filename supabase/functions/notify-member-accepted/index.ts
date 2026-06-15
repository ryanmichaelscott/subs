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
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Twilio SMS error:', res.status, err)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const body = await req.json()

  let memberPhone: string | null = null
  let memberName = 'Member'
  let service = body.service || 'your requested service'
  let contractorName = body.contractor_name || 'your contractor'
  let rate = body.rate || ''

  if (body.lead_id) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // leads → job_requests → members to get member phone
    const { data: lead, error } = await supabase
      .from('leads')
      .select('service, rate, contractors(name), job_request_id')
      .eq('id', body.lead_id)
      .single()

    if (!error && lead) {
      service = lead.service || service
      rate = lead.rate || rate
      contractorName = (lead.contractors as any)?.name || contractorName

      if (lead.job_request_id) {
        const { data: jobRequest } = await supabase
          .from('job_requests')
          .select('clerk_user_id')
          .eq('id', lead.job_request_id)
          .single()

        if (jobRequest?.clerk_user_id) {
          const { data: member } = await supabase
            .from('members')
            .select('phone, name')
            .eq('clerk_user_id', jobRequest.clerk_user_id)
            .single()

          if (member) {
            memberPhone = member.phone || null
            memberName = member.name || 'Member'
          }
        }
      }
    }
  } else {
    // Inline: { member_phone, member_name, service, contractor_name, rate }
    memberPhone = body.member_phone || null
    memberName = body.member_name || 'Member'
  }

  if (!memberPhone) {
    // No phone on record — return success so the caller isn't blocked
    return new Response(JSON.stringify({ success: true, skipped: 'no member phone' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rateClause = rate ? ` at ${rate}` : ''
  await sendSms(
    memberPhone,
    `SUBS: ${contractorName} accepted your ${service} request${rateClause}. They'll be in touch to schedule. Questions? Reply to this message.`,
  )

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

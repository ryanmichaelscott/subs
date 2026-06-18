import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function randomToken() {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function dateWindow(daysAgo: number) {
  const center = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  const from = new Date(center); from.setHours(0, 0, 0, 0)
  const to = new Date(center); to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

function scoreLinks(token: string, baseUrl: string) {
  return Array.from({ length: 10 }, (_, i) => i + 1)
    .map(s => `<a href="${baseUrl}/nps?token=${token}&score=${s}" style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:8px;background:${s >= 9 ? '#5DFF8A' : s >= 7 ? '#5B8DEF' : '#252A23'};color:${s >= 7 ? '#0C0F0A' : '#F0EEE8'};font-weight:700;font-size:15px;text-decoration:none;margin:3px;">${s}</a>`)
    .join('')
}

function buildEmail(name: string, token: string, surveyType: string) {
  const baseUrl = 'https://subs.app'
  const dayNote = surveyType === 'day45' ? '45 days' : '6 months'
  return `<!DOCTYPE html><html><body style="background:#0C0F0A;margin:0;padding:0;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#141814;border:1px solid #252A23;border-radius:16px;padding:36px 40px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:24px;">SUBS</div>
    <div style="font-size:20px;font-weight:700;color:#F0EEE8;margin-bottom:12px;">Quick question, ${name.split(' ')[0]}</div>
    <p style="font-size:14px;color:#8A9088;line-height:1.7;margin-bottom:24px;">
      You've been a SUBS member for ${dayNote} now. We'd love to know how it's going.
    </p>
    <p style="font-size:15px;color:#F0EEE8;font-weight:600;margin-bottom:20px;">
      On a scale of 1–10, how likely are you to recommend SUBS to a friend or neighbor?
    </p>
    <div style="margin-bottom:8px;font-size:11px;color:#8A9088;display:flex;justify-content:space-between;">
      <span>Not likely</span><span>Very likely</span>
    </div>
    <div style="margin-bottom:28px;">${scoreLinks(token, baseUrl)}</div>
    <p style="font-size:12px;color:#8A9088;line-height:1.6;">
      This takes one click. You can also add a short note on the next screen if you'd like.<br>
      Thank you for being a member.
    </p>
    <p style="font-size:12px;color:#8A9088;margin-top:24px;">— The SUBS Team</p>
  </div>
</body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const resendKey = Deno.env.get('RESEND_API_KEY')!

    const surveys: Array<{ type: string; days: number }> = [
      { type: 'day45', days: 45 },
      { type: 'day180', days: 180 },
    ]

    let totalSent = 0
    const errors: string[] = []

    for (const { type, days } of surveys) {
      const { from, to } = dateWindow(days)

      // Find members who signed up on this day window
      const { data: candidates } = await supabase
        .from('members')
        .select('id, email, name')
        .eq('status', 'Active')
        .gte('joined_at', from)
        .lte('joined_at', to)

      if (!candidates?.length) continue

      // Filter out those who already received this survey type
      const memberIds = candidates.map(m => m.id)
      const { data: alreadySent } = await supabase
        .from('nps_surveys_sent')
        .select('member_id')
        .in('member_id', memberIds)
        .eq('survey_type', type)

      const sentIds = new Set((alreadySent ?? []).map(s => s.member_id))
      const toSend = candidates.filter(m => !sentIds.has(m.id))

      for (const member of toSend) {
        const token = randomToken()
        try {
          // Record survey sent
          await supabase.from('nps_surveys_sent').insert({
            member_id: member.id,
            survey_type: type,
            token,
          })

          // Send email
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'SUBS <hello@subs.app>',
              to: member.email,
              subject: 'Quick question from SUBS (1 click)',
              html: buildEmail(member.name || 'there', token, type),
            }),
          })
          if (res.ok) totalSent++
          else {
            const errBody = await res.json()
            errors.push(`${member.email}: ${errBody.message || 'send failed'}`)
          }
        } catch (e) {
          errors.push(`${member.email}: ${e.message}`)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent, errors }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-nps-surveys error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

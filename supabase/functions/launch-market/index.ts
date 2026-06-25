import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'DC', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { state } = await req.json()
    if (!state) {
      return new Response(JSON.stringify({ error: 'state required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stateName = STATE_NAMES[state] || state

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: entries, error } = await supabase
      .from('waitlist')
      .select('*')
      .eq('state', state)
      .is('notified_at', null)

    if (error) throw error

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    let sent = 0

    if (RESEND_KEY && entries && entries.length > 0) {
      for (const entry of entries) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SUBS <noreply@subs.app>',
            to: entry.email,
            subject: `SUBS is now live in ${stateName}`,
            html: `
              <div style="font-family:Inter,sans-serif;background:#0C0F0A;color:#F0EEE8;padding:40px;max-width:520px;margin:0 auto;border-radius:12px;">
                <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:24px;letter-spacing:0.06em;">SUBS</div>
                <h2 style="font-size:24px;color:#F0EEE8;margin-bottom:12px;font-weight:400;">Your area is live.</h2>
                <p style="color:#8A9088;line-height:1.7;margin-bottom:20px;">
                  Hey ${entry.name || 'there'} — SUBS just launched in <strong style="color:#F0EEE8;">${stateName}</strong>.
                </p>
                <p style="color:#8A9088;line-height:1.7;margin-bottom:28px;">
                  Vetted, licensed, insured contractors. Contractor-rate pricing on every home service. One membership pays for itself the first job you book.
                </p>
                <a href="https://subs.app/login" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:28px;">
                  Sign up now →
                </a>
                <p style="font-size:13px;color:#8A9088;">— The SUBS Team</p>
              </div>
            `,
          }),
        })
        if (res.ok) sent++
        else console.error('Resend error for', entry.email, await res.text())
      }
    }

    if (entries && entries.length > 0) {
      await supabase
        .from('waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('state', state)
        .is('notified_at', null)
    }

    return new Response(JSON.stringify({ success: true, sent, total: entries?.length || 0 }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('launch-market error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

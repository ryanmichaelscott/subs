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
    const { name, email, state } = await req.json()
    if (!email || !state) {
      return new Response(JSON.stringify({ error: 'email and state required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stateName = STATE_NAMES[state] || state

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error } = await supabase
      .from('waitlist')
      .upsert({ name: name || null, email, state, zip: null }, { onConflict: 'email' })

    if (error) throw error

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <noreply@getsubs.co>',
          to: email,
          subject: "You're on the SUBS waitlist",
          html: `
            <div style="font-family:Inter,sans-serif;background:#0C0F0A;color:#F0EEE8;padding:40px;max-width:520px;margin:0 auto;border-radius:12px;">
              <div style="font-size:22px;font-weight:800;color:#5DFF8A;margin-bottom:24px;letter-spacing:0.06em;">SUBS</div>
              <h2 style="font-size:24px;color:#F0EEE8;margin-bottom:12px;font-weight:400;">You're on the list.</h2>
              <p style="color:#8A9088;line-height:1.7;margin-bottom:20px;">
                Hey ${name || 'there'} — we've saved your spot for <strong style="color:#F0EEE8;">${stateName}</strong>.
                When we launch there, you'll be the first to know.
              </p>
              <p style="color:#8A9088;line-height:1.7;margin-bottom:28px;">
                We're expanding our contractor network state by state. Most members save more on their first job than a full year of membership fees — it'll be worth the wait.
              </p>
              <p style="font-size:13px;color:#8A9088;">— The SUBS Team</p>
            </div>
          `,
        }),
      })
      if (!res.ok) console.error('Resend error (join-waitlist):', await res.text())
    }

    return new Response(JSON.stringify({ success: true, state, stateName }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('join-waitlist error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

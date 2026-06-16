import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function zipToState(zip: string): string | null {
  const prefix = parseInt(zip.slice(0, 3), 10)
  if (isNaN(prefix)) return null
  if (prefix >= 10 && prefix <= 27) return 'MA'
  if (prefix >= 28 && prefix <= 29) return 'RI'
  if (prefix >= 30 && prefix <= 38) return 'NH'
  if (prefix >= 39 && prefix <= 49) return 'ME'
  if (prefix >= 50 && prefix <= 59) return 'VT'
  if (prefix >= 60 && prefix <= 69) return 'CT'
  if (prefix >= 70 && prefix <= 89) return 'NJ'
  if (prefix >= 100 && prefix <= 149) return 'NY'
  if (prefix >= 150 && prefix <= 196) return 'PA'
  if (prefix >= 197 && prefix <= 199) return 'DE'
  if (prefix >= 200 && prefix <= 205) return 'DC'
  if (prefix >= 206 && prefix <= 219) return 'MD'
  if (prefix >= 220 && prefix <= 246) return 'VA'
  if (prefix >= 247 && prefix <= 268) return 'WV'
  if (prefix >= 270 && prefix <= 289) return 'NC'
  if (prefix >= 290 && prefix <= 299) return 'SC'
  if (prefix >= 300 && prefix <= 319) return 'GA'
  if (prefix >= 320 && prefix <= 349) return 'FL'
  if (prefix >= 350 && prefix <= 369) return 'AL'
  if (prefix >= 370 && prefix <= 385) return 'TN'
  if (prefix >= 386 && prefix <= 397) return 'MS'
  if (prefix >= 400 && prefix <= 427) return 'KY'
  if (prefix >= 430 && prefix <= 458) return 'OH'
  if (prefix >= 460 && prefix <= 479) return 'IN'
  if (prefix >= 480 && prefix <= 499) return 'MI'
  if (prefix >= 500 && prefix <= 528) return 'IA'
  if (prefix >= 530 && prefix <= 549) return 'WI'
  if (prefix >= 550 && prefix <= 567) return 'MN'
  if (prefix >= 570 && prefix <= 577) return 'SD'
  if (prefix >= 580 && prefix <= 588) return 'ND'
  if (prefix >= 590 && prefix <= 599) return 'MT'
  if (prefix >= 600 && prefix <= 629) return 'IL'
  if (prefix >= 630 && prefix <= 658) return 'MO'
  if (prefix >= 660 && prefix <= 679) return 'KS'
  if (prefix >= 680 && prefix <= 693) return 'NE'
  if (prefix >= 700 && prefix <= 714) return 'LA'
  if (prefix >= 716 && prefix <= 729) return 'AR'
  if (prefix >= 730 && prefix <= 749) return 'OK'
  if (prefix >= 750 && prefix <= 799) return 'TX'
  if (prefix >= 800 && prefix <= 816) return 'CO'
  if (prefix >= 820 && prefix <= 831) return 'WY'
  if (prefix >= 832 && prefix <= 839) return 'ID'
  if (prefix >= 840 && prefix <= 847) return 'UT'
  if (prefix >= 850 && prefix <= 865) return 'AZ'
  if (prefix >= 870 && prefix <= 884) return 'NM'
  if (prefix >= 889 && prefix <= 898) return 'NV'
  if (prefix >= 900 && prefix <= 961) return 'CA'
  if (prefix >= 967 && prefix <= 968) return 'HI'
  if (prefix >= 970 && prefix <= 979) return 'OR'
  if (prefix >= 980 && prefix <= 994) return 'WA'
  if (prefix >= 995 && prefix <= 999) return 'AK'
  return null
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
    const { name, email, zip } = await req.json()
    if (!email || !zip) {
      return new Response(JSON.stringify({ error: 'email and zip required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const cleanZip = String(zip).replace(/\D/g, '').slice(0, 5)
    const state = zipToState(cleanZip) || 'Unknown'
    const stateName = STATE_NAMES[state] || state

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error } = await supabase
      .from('waitlist')
      .upsert({ name: name || null, email, zip: cleanZip, state }, { onConflict: 'email' })

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
                Hey ${name || 'there'} — we've saved your spot for zip code <strong style="color:#F0EEE8;">${cleanZip}</strong>.
                When we launch in ${stateName}, you'll be the first to know.
              </p>
              <p style="color:#8A9088;line-height:1.7;margin-bottom:28px;">
                We're adding new markets as our contractor network grows. Most members save more on their first job than a decade of membership fees — it'll be worth the wait.
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

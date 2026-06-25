import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const welcomeEmail = (name: string) => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, system-ui, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px;">
    <div style="font-size: 22px; font-weight: 800; color: #1a1a1a; letter-spacing: 0.06em; margin-bottom: 28px;">SUBS</div>
    <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 16px;">Hi ${name},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 16px;">
      Welcome to SUBS. Your membership is active and your contractor pricing is ready.
    </p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
      Here's what you now have access to:
    </p>
    <ul style="padding-left: 20px; margin-bottom: 28px;">
      <li style="font-size: 15px; color: #555; line-height: 1.8;">Contractor-rate pricing on 30+ trades</li>
      <li style="font-size: 15px; color: #555; line-height: 1.8;">Your published member discount schedule</li>
      <li style="font-size: 15px; color: #555; line-height: 1.8;">Priority dispatch across all vetted SUBS vendors</li>
      <li style="font-size: 15px; color: #555; line-height: 1.8;">Free quote gut-check — text us any quote</li>
    </ul>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 28px;">
      To book a service, log into your member dashboard and request a job — we'll match you with a vetted contractor in your area at your member rate.
    </p>
    <a href="https://subs.app/dashboard" style="display: inline-block; background: #5DFF8A; color: #0C0F0A; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
      Go to my dashboard →
    </a>
    <p style="font-size: 13px; color: #999; margin-top: 40px;">
      Questions? Reply to this email or text us. We respond fast.
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

  const { email, name } = await req.json()
  if (!email) {
    return new Response(JSON.stringify({ error: 'email required' }), {
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
      to: email,
      subject: 'Welcome to SUBS — your contractor pricing is ready',
      html: welcomeEmail(name || 'there'),
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

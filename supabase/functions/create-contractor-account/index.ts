import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { company_name, trades, contact_name, email, phone, service_area } = await req.json()

    if (!company_name?.trim() || !email?.trim() || !trades?.length) {
      return new Response(JSON.stringify({ error: 'Company name, email, and at least one trade are required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const normalizedEmail = email.toLowerCase().trim()

    // Reject duplicate applications
    const { data: existing } = await supabase
      .from('contractors')
      .select('id')
      .eq('contact_email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'An application with this email already exists.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create contractor record with status pending
    const { error: dbError } = await supabase.from('contractors').insert({
      name: company_name.trim(),
      trade: trades[0],
      trades,
      contact_name: contact_name?.trim() || '',
      contact_email: normalizedEmail,
      phone: phone?.trim() || '',
      service_area: service_area ? JSON.stringify(service_area) : null,
      status: 'pending',
    })

    if (dbError) throw new Error(dbError.message)

    // Notify admin — non-critical
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'contractor',
          name: contact_name?.trim() || '',
          email: normalizedEmail,
          phone: phone?.trim() || '',
          trades,
          company_name: company_name.trim(),
        }),
      })
    } catch (e) { console.error('Admin notify error:', e) }

    // Create Clerk user account — enables OTP login immediately
    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')
    let clerkCreated = false
    if (clerkKey) {
      const nameParts = (contact_name || company_name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || 'Partner'
      const lastName = nameParts.slice(1).join(' ') || '-'

      const resp = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_address: [normalizedEmail],
          first_name: firstName,
          last_name: lastName,
          public_metadata: { role: 'contractor' },
          skip_password_requirement: true,
          skip_password_checks: true,
        }),
      })
      const rawText = await resp.text()
      let body: any = {}
      try { body = JSON.parse(rawText) } catch { /* not JSON */ }
      if (resp.ok) {
        clerkCreated = true
        console.log('[contractor] Clerk account created:', body.id, 'for', normalizedEmail)
      } else {
        const alreadyExists = body?.errors?.some((e: any) =>
          e.code === 'form_identifier_exists' || e.code === 'duplicate_record'
        )
        if (alreadyExists) {
          clerkCreated = true
          console.log('[contractor] Clerk account already exists for', normalizedEmail)
        } else {
          console.error('[contractor] Clerk FAILED', resp.status, normalizedEmail, rawText.slice(0, 800))
        }
      }
    } else {
      console.error('[contractor] CLERK_SECRET_KEY not set')
    }

    // Send welcome email with login instructions via Resend
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'
      const loginLink = `${appUrl}/contractor/login`

      if (resendKey) {
        const welcomeHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0C0F0A;color:#F0EEE8;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    <h1 style="font-size:30px;font-weight:700;color:#F0EEE8;margin:0 0 16px;line-height:1.2;">
      Welcome, ${contact_name || company_name}!
    </h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0 0 32px;">
      We received your application for <strong style="color:#F0EEE8;">${company_name}</strong>. We review every partner — typically 1–2 business days. In the meantime, log in to start building your profile.
    </p>
    <a href="${loginLink}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
      Log In to Your Account →
    </a>
    <p style="font-size:13px;color:#8A9088;line-height:1.6;margin:0;">
      Enter your email — we'll send a one-time code to sign you in.
    </p>
    <p style="font-size:13px;color:#8A9088;margin-top:32px;line-height:1.6;">
      Questions? <a href="mailto:partners@subs.app" style="color:#5DFF8A;text-decoration:none;">partners@subs.app</a>
    </p>
  </div>
</body>
</html>`

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SUBS <hello@subs.app>',
            to: normalizedEmail,
            subject: 'Application received — log in to build your profile',
            html: welcomeHtml,
          }),
        })
      }
    } catch (e) {
      console.error('Welcome email error:', e)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { contractor_id } = await req.json()
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: contractor, error: fetchError } = await supabase
      .from('contractors')
      .select('*')
      .eq('id', contractor_id)
      .single()

    if (fetchError || !contractor) {
      return new Response(JSON.stringify({ error: 'Contractor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Works for both approved (needs to sign) and docs_signed (needs to pay)
    if (!['approved', 'docs_signed'].includes(contractor.status)) {
      return new Response(JSON.stringify({ error: 'Contractor must be in approved or docs_signed status' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'
    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')

    // Ensure Clerk account exists so OTP login works
    if (clerkKey) {
      const nameParts = (contractor.contact_name || contractor.name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || 'Partner'
      const lastName = nameParts.slice(1).join(' ') || '-'

      const createRes = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_address: [contractor.contact_email],
          first_name: firstName,
          last_name: lastName,
          public_metadata: { role: 'contractor' },
          skip_password_requirement: true,
          skip_password_checks: true,
        }),
      })

      const createData = await createRes.json()
      if (!createRes.ok) {
        const alreadyExists = createData?.errors?.some((e: any) =>
          e.code === 'form_identifier_exists' || e.code === 'duplicate_record'
        )
        if (!alreadyExists) {
          console.error(`Clerk user creation ${createRes.status}:`, JSON.stringify(createData))
        }
      }
    }

    // Generate a direct Stripe checkout URL for all statuses — payment is the primary action
    let checkoutUrl: string | null = null
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: 'price_1TicGZAYDs9oVarWmVWT27wz', quantity: 1 }],
          customer_email: contractor.contact_email,
          success_url: `${appUrl}/contractor/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/contractor/login`,
          metadata: { email: contractor.contact_email, company_name: contractor.name },
          allow_promotion_codes: true,
        })
        checkoutUrl = session.url
      } catch (e) {
        console.error('Stripe session creation failed:', e.message)
      }
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ success: true, warning: 'RESEND_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contractorName = contractor.contact_name || contractor.name || 'there'
    const firstName = contractorName.split(' ')[0]
    const trade = contractor.trade || 'your trade'
    const loginLink = `${appUrl}/contractor/login`

    const isDocsSigned = contractor.status === 'docs_signed'
    const subject = `${firstName}, your SUBS spot isn't reserved yet`

    const primaryCta = checkoutUrl
      ? { label: 'Reserve My Spot — Complete Payment →', url: checkoutUrl }
      : { label: 'Log In to Complete Your Application →', url: loginLink }

    const stepsList = isDocsSigned
      ? `<tr><td style="padding:10px 0;border-bottom:1px solid #252A23;">
           <span style="color:#5DFF8A;font-weight:700;">✓</span>
           <span style="color:#5DFF8A;margin-left:10px;">Application approved</span>
         </td></tr>
         <tr><td style="padding:10px 0;border-bottom:1px solid #252A23;">
           <span style="color:#5DFF8A;font-weight:700;">✓</span>
           <span style="color:#5DFF8A;margin-left:10px;">Agreement signed</span>
         </td></tr>
         <tr><td style="padding:10px 0;">
           <span style="color:#F0EEE8;font-weight:700;">→</span>
           <span style="color:#F0EEE8;font-weight:700;margin-left:10px;">Activate subscription to reserve your spot</span>
         </td></tr>`
      : `<tr><td style="padding:10px 0;border-bottom:1px solid #252A23;">
           <span style="color:#5DFF8A;font-weight:700;">✓</span>
           <span style="color:#5DFF8A;margin-left:10px;">Application approved</span>
         </td></tr>
         <tr><td style="padding:10px 0;border-bottom:1px solid #252A23;">
           <span style="color:#F0EEE8;font-weight:700;">→</span>
           <span style="color:#F0EEE8;font-weight:700;margin-left:10px;">Activate subscription to reserve your spot</span>
         </td></tr>
         <tr><td style="padding:10px 0;">
           <span style="color:#8A9088;margin-left:10px;">Upload documents to go live</span>
         </td></tr>`

    const bodyText = isDocsSigned
      ? `Your agreement is signed — the only step left is payment. Once your subscription is active, your spot as a SUBS ${trade} partner is locked in and you'll start receiving pre-qualified homeowners in your area.`
      : `Your application is approved — but your spot as a SUBS ${trade} partner won't be reserved until your subscription is active. Complete payment now to lock it in. Documents can be uploaded right after.`

    const urgencyNote = checkoutUrl
      ? `<p style="font-size:12px;color:#8A9088;margin:16px 0 0;line-height:1.6;">This payment link is valid for 24 hours. If it expires, log in at <a href="${loginLink}" style="color:#5DFF8A;text-decoration:none;">subs.app/contractor/login</a> to complete payment from your dashboard.</p>`
      : ''

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;width:100%;">

  <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
    <table width="100%"><tr>
      <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
      <td align="right"><span style="background:#5DFF8A22;color:#5DFF8A;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;border:1px solid #5DFF8A44;">Partner Program</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:28px 32px 20px;">
    <div style="font-size:11px;font-weight:800;color:#F59E0B;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Action Required</div>
    <h1 style="font-size:26px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.2;">
      Your spot isn't reserved yet, ${firstName}.
    </h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0 0 8px;">
      ${bodyText}
    </p>
    <p style="font-size:14px;color:#F0EEE8;line-height:1.6;margin:8px 0 0;">
      We only work with a limited number of <strong>${trade}</strong> contractors per market — your spot is held but not confirmed until your subscription is active.
    </p>
  </td></tr>

  <tr><td style="padding:0 32px 24px;">
    <table width="100%" style="background:#0C0F0A;border:1px solid #252A23;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid #252A23;">
        <div style="font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Your progress</div>
      </td></tr>
      <tr><td style="padding:4px 20px 4px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${stepsList}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 32px 8px;">
    <a href="${primaryCta.url}" style="display:block;background:#5DFF8A;color:#0C0F0A;font-size:15px;font-weight:800;padding:16px 24px;border-radius:10px;text-decoration:none;text-align:center;">
      ${primaryCta.label}
    </a>
    ${urgencyNote}
  </td></tr>

  ${checkoutUrl ? `
  <tr><td style="padding:16px 32px 8px;text-align:center;">
    <span style="font-size:13px;color:#8A9088;">Prefer to log in instead? </span>
    <a href="${loginLink}" style="font-size:13px;color:#5DFF8A;text-decoration:none;">Go to contractor login →</a>
  </td></tr>` : ''}

  <tr><td style="padding:24px 32px;border-top:1px solid #252A23;margin-top:16px;">
    <p style="margin:0;font-size:12px;color:#8A9088;line-height:1.8;">
      Questions? <a href="mailto:partners@subs.app" style="color:#5DFF8A;text-decoration:none;">partners@subs.app</a> or call <span style="color:#F0EEE8;">1-888-454-3019</span>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SUBS Partners <hello@subs.app>',
        to: contractor.contact_email,
        subject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}))
      console.error('Resend error:', JSON.stringify(err))
    }

    return new Response(
      JSON.stringify({ success: true, checkout_url_generated: !!checkoutUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

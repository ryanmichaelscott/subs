import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ensureReferralCode } from '../_shared/contractor-referral.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { contractor_id } = await req.json()
  if (!contractor_id) {
    return new Response(JSON.stringify({ error: 'contractor_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch contractor
  const { data: contractor, error: fetchError } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', contractor_id)
    .single()

  if (fetchError || !contractor) {
    return new Response(JSON.stringify({ error: 'Contractor not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!contractor.contact_email) {
    return new Response(JSON.stringify({ error: 'Contractor has no email address' }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'
  const clerkKey = Deno.env.get('CLERK_SECRET_KEY')
  let clerkInviteId: string | undefined

  // Create Clerk invitation — notify:false since we send our own approval email via Resend.
  // Any 4xx means the email already exists in Clerk (pending invite OR existing user) — non-fatal.
  // A 5xx from Clerk is logged but we still proceed so the approval + email always land.
  if (clerkKey) {
    const clerkRes = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: contractor.contact_email,
        redirect_url: `${appUrl}/contractor/dashboard`,
        public_metadata: { role: 'contractor' },
        notify: false,
      }),
    })

    const clerkData = await clerkRes.json()

    if (clerkRes.ok) {
      clerkInviteId = clerkData.id
    } else {
      // 4xx = duplicate invite or user already exists in Clerk — not a blocker
      // 5xx = Clerk server error — log it but still approve
      console.error(`Clerk invitation ${clerkRes.status}:`, JSON.stringify(clerkData))
    }
  }

  // Update contractor to approved
  const { error: updateError } = await supabase
    .from('contractors')
    .update({
      status: 'approved',
      ...(clerkInviteId ? { clerk_invitation_id: clerkInviteId } : {}),
    })
    .eq('id', contractor_id)

  if (updateError) {
    console.error('Failed to update contractor status:', updateError)
    return new Response(JSON.stringify({ error: 'Failed to update contractor status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Generate referral code + Stripe promo code — non-fatal if it fails
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
    await ensureReferralCode(supabase, stripeKey, contractor)
  } catch (e) {
    console.error('[approve-contractor] referral code generation failed:', e.message)
  }

  // Send branded approval email via Resend
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const loginLink = `${appUrl}/contractor/login`

  if (resendKey) {
    const approvalHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0C0F0A;color:#F0EEE8;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    <h1 style="font-size:30px;font-weight:700;color:#F0EEE8;margin:0 0 16px;line-height:1.2;">
      You're approved, ${contractor.contact_name || contractor.name}!
    </h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0 0 32px;">
      Your application for <strong style="color:#F0EEE8;">${contractor.name}</strong> has been reviewed and approved. Log in to activate your account and start receiving pre-qualified homeowners in your area.
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

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SUBS <hello@subs.app>',
        to: contractor.contact_email,
        subject: "You're approved — select your SUBS partner plan",
        html: approvalHtml,
      }),
    })

    if (!resendRes.ok) {
      const resendErr = await resendRes.json().catch(() => ({}))
      console.error('Resend error:', JSON.stringify(resendErr))
    }
  }

  return new Response(
    JSON.stringify({ success: true, invitation_id: clerkInviteId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

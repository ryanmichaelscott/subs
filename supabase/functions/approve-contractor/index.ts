import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  // Create Clerk invitation with notify: false — we'll send our own branded email via Resend
  const clerkRes = await fetch('https://api.clerk.com/v1/invitations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CLERK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: contractor.contact_email,
      public_metadata: { role: 'contractor' },
      notify: false,
    }),
  })

  const clerkData = await clerkRes.json()

  const isDuplicate = !clerkRes.ok &&
    clerkData?.errors?.some((e: any) => e.code === 'duplicate_record')

  if (!clerkRes.ok && !isDuplicate) {
    return new Response(
      JSON.stringify({ error: 'Failed to create Clerk invitation', details: clerkData }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Update contractor to approved and store the invitation ID
  const { error: updateError } = await supabase
    .from('contractors')
    .update({
      status: 'approved',
      clerk_invitation_id: clerkData.id,
    })
    .eq('id', contractor_id)

  if (updateError) {
    console.error('Failed to update contractor status:', updateError)
  }

  // Send branded approval email via Resend
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'
  const checkoutLink = `${appUrl}/contractor/checkout`
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
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0 0 12px;">
      Your application for <strong style="color:#F0EEE8;">${contractor.name}</strong> has been reviewed and approved by the SUBS team.
    </p>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0 0 32px;">
      Select your plan below to activate your account and start receiving pre-qualified homeowners in your service area — no bidding, no slow seasons.
    </p>
    <a href="${checkoutLink}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
      Select Your Plan →
    </a>
    <p style="font-size:13px;color:#8A9088;margin-top:40px;line-height:1.6;">
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
        to: contractor.contact_email,
        subject: "You're approved — select your SUBS partner plan",
        html: approvalHtml,
      }),
    })
  }

  return new Response(
    JSON.stringify({ success: true, invitation_id: clerkData.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

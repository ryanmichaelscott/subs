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
  const magicLink = clerkData.url || 'https://getsubs.co/contractor/login'
  if (resendKey && !isDuplicate) {
    const approvalHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, system-ui, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px;">
    <div style="font-size: 22px; font-weight: 800; color: #1a1a1a; letter-spacing: 0.06em; margin-bottom: 28px;">SUBS</div>
    <div style="display: inline-block; background: #DCFCE7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 100px; margin-bottom: 20px; letter-spacing: 0.06em;">
      APPLICATION APPROVED
    </div>
    <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 16px;">Hi ${contractor.contact_name || contractor.name},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 16px;">
      You've been approved as a SUBS contractor partner. Welcome to the network.
    </p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 28px;">
      Click below to set up your account — this link expires in 7 days.
    </p>
    <a href="${magicLink}" style="display: inline-block; background: #5DFF8A; color: #0C0F0A; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
      Set up my account →
    </a>
    <p style="font-size: 13px; color: #999; margin-top: 32px; line-height: 1.5;">
      Once you're in, complete your profile and rate card so members can find you. Leads will start coming in shortly after.
    </p>
    <p style="font-size: 15px; color: #1a1a1a; margin-top: 8px;">— The SUBS Team</p>
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
        subject: "You're approved — set up your SUBS partner account",
        html: approvalHtml,
      }),
    })
  }

  return new Response(
    JSON.stringify({ success: true, invitation_id: clerkData.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    if (contractor.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Contractor is not in approved status' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'
    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')
    let clerkInviteSent = false

    if (clerkKey) {
      // Revoke any existing pending invitations for this email so we can create a fresh one
      const listRes = await fetch(
        `https://api.clerk.com/v1/invitations?status=pending&query=${encodeURIComponent(contractor.contact_email)}`,
        { headers: { 'Authorization': `Bearer ${clerkKey}` } },
      )
      if (listRes.ok) {
        const { data: pendingInvites } = await listRes.json().catch(() => ({ data: [] }))
        if (Array.isArray(pendingInvites)) {
          for (const invite of pendingInvites) {
            if (invite.email_address === contractor.contact_email) {
              await fetch(`https://api.clerk.com/v1/invitations/${invite.id}/revoke`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${clerkKey}` },
              })
            }
          }
        }
      }

      // Create a fresh invitation — notify:true so Clerk sends the magic-link email
      const inviteRes = await fetch('https://api.clerk.com/v1/invitations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: contractor.contact_email,
          redirect_url: `${appUrl}/contractor/dashboard`,
          public_metadata: { role: 'contractor' },
          notify: true,
        }),
      })

      const inviteData = await inviteRes.json()

      if (inviteRes.ok) {
        clerkInviteSent = true
        // Store updated invitation ID
        await supabase
          .from('contractors')
          .update({ clerk_invitation_id: inviteData.id })
          .eq('id', contractor_id)
      } else {
        // 4xx usually means user already has a Clerk account — they can log in via OTP
        console.log(`Clerk invitation ${inviteRes.status} (user may already exist):`, JSON.stringify(inviteData))
      }
    }

    // Always send a Resend email with clear login + checkout instructions
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const loginLink = `${appUrl}/contractor/login`
      const checkoutLink = `${appUrl}/contractor/checkout`

      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:#0C0F0A;color:#F0EEE8;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    <h1 style="font-size:28px;font-weight:700;color:#F0EEE8;margin:0 0 16px;line-height:1.2;">
      Your SUBS partner account is ready.
    </h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0 0 28px;">
      <strong style="color:#F0EEE8;">${contractor.name}</strong> — your application is approved. Complete these two steps to activate your account and start receiving leads.
    </p>

    <div style="background:#141814;border:1px solid #252A23;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#5DFF8A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Step 1 — Log in</div>
      <p style="font-size:14px;color:#8A9088;margin:0 0 16px;line-height:1.6;">
        Go to your partner login page and enter your email. We'll send a one-time code to sign you in.
      </p>
      <a href="${loginLink}" style="display:inline-block;background:#141814;border:1px solid #252A23;color:#F0EEE8;font-weight:600;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">
        ${loginLink}
      </a>
    </div>

    <div style="background:#141814;border:1px solid #252A23;border-radius:12px;padding:24px;margin-bottom:32px;">
      <div style="font-size:11px;font-weight:700;color:#5DFF8A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Step 2 — Select your plan</div>
      <p style="font-size:14px;color:#8A9088;margin:0 0 16px;line-height:1.6;">
        Once logged in, subscribe to activate your account and start receiving pre-qualified homeowners.
      </p>
      <a href="${checkoutLink}" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Select Your Plan →
      </a>
    </div>

    <p style="font-size:13px;color:#8A9088;line-height:1.6;">
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
          subject: 'Your SUBS partner account is ready — log in to activate',
          html,
        }),
      })

      if (!resendRes.ok) {
        const err = await resendRes.json().catch(() => ({}))
        console.error('Resend error:', JSON.stringify(err))
      }
    }

    return new Response(
      JSON.stringify({ success: true, clerk_invite_sent: clerkInviteSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

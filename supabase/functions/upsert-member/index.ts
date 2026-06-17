import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { clerk_user_id, email, name, phone, zip, referral_code } = await req.json()

    if (!clerk_user_id) {
      return new Response(JSON.stringify({ error: 'clerk_user_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: existing } = await supabase
      .from('members')
      .select('*')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (existing) {
      const updates: Record<string, string> = {}
      if (email) updates.email = email
      if (name) updates.name = name
      if (phone !== undefined) updates.phone = phone
      if (zip !== undefined) updates.zip = zip

      const { data } = await supabase
        .from('members')
        .update(updates)
        .eq('clerk_user_id', clerk_user_id)
        .select()
        .single()

      return new Response(JSON.stringify({ member: data || existing, created: false }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Create new member
    const { data: newMember } = await supabase
      .from('members')
      .insert({
        clerk_user_id,
        email: email || '',
        name: name || '',
        phone: phone || null,
        zip: zip || null,
        tier: 'Member',
        status: 'Trial',
      })
      .select()
      .single()

    // Track referral if a code was provided
    if (referral_code && newMember) {
      const { data: referrer } = await supabase
        .from('members')
        .select('id, email, name')
        .eq('referral_code', referral_code)
        .neq('id', newMember.id)
        .single()

      if (referrer) {
        await supabase.from('referrals').upsert({
          referrer_id: referrer.id,
          referred_email: email || '',
          referred_clerk_user_id: clerk_user_id,
        }, { onConflict: 'referrer_id,referred_email', ignoreDuplicates: true })

        // Email the referrer
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey && referrer.email) {
          const firstName = referrer.name?.split(' ')[0] || 'there'
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'SUBS <noreply@subsapp.com>',
              to: referrer.email,
              subject: 'Someone just joined SUBS with your link!',
              html: `
                <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0C0F0A;color:#F0EEE8">
                  <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:24px">SUBS</div>
                  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Your referral link is working, ${firstName}!</h2>
                  <p style="color:#8A9088;line-height:1.6;margin:0 0 20px">
                    Someone just signed up using your referral link. Once they become a paying member, you'll earn a reward.
                  </p>
                  <div style="background:#141814;border:1px solid #252A23;border-radius:10px;padding:16px 20px;margin-bottom:24px">
                    <div style="font-size:12px;color:#8A9088;margin-bottom:4px">REWARD MILESTONES</div>
                    <div style="font-size:14px;color:#F0EEE8;margin-bottom:6px">1 paying referral → <strong style="color:#5DFF8A">$20 off</strong> your next renewal</div>
                    <div style="font-size:14px;color:#F0EEE8">3 paying referrals → <strong style="color:#5DFF8A">100% off</strong> — a free year</div>
                  </div>
                  <a href="https://www.subsapp.com/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
                    View your referrals →
                  </a>
                </div>
              `,
            }),
          })
        }
      }
    }

    return new Response(JSON.stringify({ member: newMember, created: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('upsert-member error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

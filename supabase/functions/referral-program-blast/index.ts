import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { referralLaunchEmail } from '../_shared/contractor-emails.ts'

// One-time referral program announcement to existing approved/active contractors.
// mode 'preview' (default): returns every personalized payload, sends NOTHING.
// mode 'send' + confirm 'SEND-THE-BLAST': sends via Resend. The tracking row
// (blast_referral_launch) makes the blast one-time even if invoked twice.
serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'preview'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const appUrl = Deno.env.get('APP_URL') || 'https://subs.app'

  const { data: contractors, error } = await supabase
    .from('contractors')
    .select('id, name, contact_name, contact_email, status, referral_code')
    .in('status', ['approved', 'active', 'docs_signed'])
    .not('referral_code', 'is', null)
    .not('contact_email', 'is', null)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const payloads = (contractors || []).map(c => {
    const firstName = (c.contact_name || c.name || 'Partner').trim().split(/\s+/)[0]
    const { subject, html } = referralLaunchEmail(firstName, c.referral_code, appUrl)
    return {
      contractor_id: c.id,
      company: c.name,
      to: c.contact_email,
      first_name: firstName,
      code: c.referral_code,
      link: `${appUrl}/?ref=${c.referral_code}`,
      subject,
      html,
    }
  })

  if (mode === 'preview') {
    console.log(`[blast] PREVIEW — ${payloads.length} recipients, nothing sent`)
    return new Response(JSON.stringify({
      mode: 'preview',
      recipient_count: payloads.length,
      recipients: payloads.map(({ html, ...rest }) => rest),
      sample_html: payloads[0]?.html || null,
    }, null, 2), { headers: { 'Content-Type': 'application/json' } })
  }

  if (mode === 'send') {
    if (body.confirm !== 'SEND-THE-BLAST') {
      return new Response(JSON.stringify({ error: 'send requires confirm: "SEND-THE-BLAST"' }), { status: 400 })
    }
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })

    const results: any[] = []
    for (const p of payloads) {
      // Claim first — unique constraint makes the blast one-time per contractor
      const { error: claimErr } = await supabase
        .from('contractor_sequence_emails')
        .insert({ contractor_id: p.contractor_id, email_key: 'blast_referral_launch' })
      if (claimErr) { results.push({ to: p.to, skipped: 'already sent' }); continue }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'SUBS <hello@subs.app>', to: p.to, subject: p.subject, html: p.html }),
      })
      if (!res.ok) {
        await supabase.from('contractor_sequence_emails').delete()
          .eq('contractor_id', p.contractor_id).eq('email_key', 'blast_referral_launch')
        results.push({ to: p.to, error: (await res.text()).slice(0, 200) })
      } else {
        results.push({ to: p.to, sent: true })
      }
    }
    const sentCount = results.filter(r => r.sent).length
    console.log(`[blast] SENT ${sentCount}/${payloads.length}`)
    return new Response(JSON.stringify({ mode: 'send', sent_count: sentCount, results }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: `unknown mode: ${mode}` }), { status: 400 })
})

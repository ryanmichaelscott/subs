import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok  = (body: object) => new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } })
const err = (msg: string)  => { console.error('[send-member-access]', msg); return ok({ error: msg }) }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, clerk_user_id } = await req.json()
    if (!email && !clerk_user_id) return err('email or clerk_user_id required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')
    if (!clerkKey) return err('CLERK_SECRET_KEY not set in Supabase secrets')

    // Look up member
    const query = supabase.from('members').select('clerk_user_id, email, name, tier')
    const { data: member, error: dbErr } = clerk_user_id
      ? await query.eq('clerk_user_id', clerk_user_id).maybeSingle()
      : await query.eq('email', email.toLowerCase().trim()).maybeSingle()

    if (dbErr) return err('DB error: ' + dbErr.message)
    if (!member) return err(`Member not found for ${email || clerk_user_id}`)

    // Resolve Clerk user ID — member record may have it, or look it up by email
    let userId = member.clerk_user_id

    if (!userId) {
      // Try looking up by email in Clerk
      const lookupRes = await fetch(
        `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(member.email)}`,
        { headers: { 'Authorization': `Bearer ${clerkKey}` } }
      )
      const lookupText = await lookupRes.text()
      let users: any[] = []
      try { users = JSON.parse(lookupText) } catch {}
      if (Array.isArray(users) && users[0]) {
        userId = users[0].id
        await supabase.from('members').update({ clerk_user_id: userId }).eq('email', member.email)
        console.log('[send-member-access] found Clerk user by email:', userId)
      }
    }

    if (!userId) {
      // Create Clerk account
      const nameParts = (member.name || '').trim().split(/\s+/)
      const createRes = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_address: [member.email],
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          skip_password_requirement: true,
          skip_password_checks: true,
          public_metadata: { role: 'member', tier: member.tier || 'Member' },
        }),
      })
      const createText = await createRes.text()
      let createData: any = {}
      try { createData = JSON.parse(createText) } catch {}

      if (createRes.ok) {
        userId = createData.id
        await supabase.from('members').update({ clerk_user_id: userId }).eq('email', member.email)
        console.log('[send-member-access] created Clerk user:', userId)
      } else {
        return err(`Clerk account creation failed (${createRes.status}): ${createText.slice(0, 300)}`)
      }
    }

    // Create sign-in token
    const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, expires_in_seconds: 86400 }),
    })
    const tokenText = await tokenRes.text()
    let tokenData: any = {}
    try { tokenData = JSON.parse(tokenText) } catch {}

    if (!tokenRes.ok) return err(`Sign-in token failed (${tokenRes.status}): ${tokenText.slice(0, 300)}`)

    const magicLink = `https://subs.app/welcome?ticket=${tokenData.token}`
    console.log('[send-member-access] magic link created for', member.email)

    // Send welcome email
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: member.email, name: member.name || '', tier: member.tier || 'Member', magic_link: magicLink }),
    })

    return ok({ success: true, magic_link: magicLink })
  } catch (e) {
    return err(e.message)
  }
})

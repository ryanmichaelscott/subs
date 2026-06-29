import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, clerk_user_id } = await req.json()
    if (!email && !clerk_user_id) {
      return new Response(JSON.stringify({ error: 'email or clerk_user_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')!

    // Look up member
    const query = supabase.from('members').select('clerk_user_id, email, name, tier')
    const { data: member } = clerk_user_id
      ? await query.eq('clerk_user_id', clerk_user_id).single()
      : await query.eq('email', email.toLowerCase().trim()).single()

    if (!member) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Ensure Clerk account exists — create if missing
    let userId = member.clerk_user_id
    if (!userId && member.email) {
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
      const createData = await createRes.json()
      if (createRes.ok) {
        userId = createData.id
      } else {
        // Try lookup if already exists
        const lookupRes = await fetch(
          `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(member.email)}`,
          { headers: { 'Authorization': `Bearer ${clerkKey}` } }
        )
        const users = await lookupRes.json()
        userId = Array.isArray(users) && users[0] ? users[0].id : null
      }
      if (userId) {
        await supabase.from('members').update({ clerk_user_id: userId }).eq('email', member.email)
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Could not find or create Clerk account' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Create sign-in token
    const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, expires_in_seconds: 86400 }),
    })
    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return new Response(JSON.stringify({ error: 'Could not create sign-in token: ' + err }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const { token } = await tokenRes.json()
    const magicLink = `https://subs.app/welcome?ticket=${token}`

    // Send welcome email
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: member.email,
        name: member.name || '',
        tier: member.tier || 'Member',
        magic_link: magicLink,
      }),
    })

    return new Response(JSON.stringify({ success: true, magic_link: magicLink }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

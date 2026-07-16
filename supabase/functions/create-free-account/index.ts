import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Free-tier signup: no Stripe involved. Called by /join after the user
// completes Clerk signup. Creates the members row (tier Free, Active) and
// stamps Clerk public metadata { role: 'member', tier: 'free' }.
//
// Safe to call repeatedly and safe for existing members: if a members row
// already exists for this Clerk user, it is returned unchanged — a paid
// member visiting /join is never downgraded.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { clerk_user_id } = await req.json()
    if (!clerk_user_id) {
      return new Response(JSON.stringify({ error: 'clerk_user_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')!
    // Verify the user actually exists in Clerk and pull canonical email/name —
    // never trust client-supplied identity fields.
    const userRes = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerk_user_id)}`, {
      headers: { 'Authorization': `Bearer ${clerkKey}` },
    })
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Unknown user' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const clerkUser = await userRes.json()
    const email = clerkUser.email_addresses?.[0]?.email_address || ''
    const name = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Existing member (paid or free) — return as-is, never downgrade
    const { data: existing } = await supabase
      .from('members')
      .select('id, tier, status')
      .eq('clerk_user_id', clerk_user_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ success: true, member: existing, created: false }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: member, error: insertErr } = await supabase
      .from('members')
      .insert({
        clerk_user_id,
        email,
        name,
        tier: 'Free',
        status: 'Active',
        request_count: 0,
        request_year: new Date().getFullYear(),
      })
      .select('id, tier, status')
      .single()
    if (insertErr) throw new Error(insertErr.message)

    // Clerk metadata: role member, tier free (lowercase per convention).
    // Preserve admin/staff roles if somehow present.
    const existingRole = clerkUser.public_metadata?.role
    const safeRole = (existingRole === 'admin' || existingRole === 'staff') ? existingRole : 'member'
    const metaRes = await fetch(`https://api.clerk.com/v1/users/${clerk_user_id}/metadata`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_metadata: { ...clerkUser.public_metadata, role: safeRole, tier: 'free' } }),
    })
    if (!metaRes.ok) console.error('[create-free-account] clerk metadata error:', await metaRes.text())

    // Fire-and-forget admin notification
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'member', name, email, tier: 'Free' }),
      })
    } catch (e) { console.error('[create-free-account] notify error:', e) }

    return new Response(JSON.stringify({ success: true, member, created: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-free-account error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

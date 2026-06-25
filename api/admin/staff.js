import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .neq('status', 'removed')
      .order('added_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ staff: data })
  }

  if (req.method === 'POST') {
    const { full_name, email, role } = req.body || {}
    if (!full_name || !email) return res.status(400).json({ error: 'full_name and email required' })
    if (!['staff', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be staff or admin' })

    const clerkKey = process.env.CLERK_SECRET_KEY
    let invitationId = null

    if (clerkKey) {
      const appUrl = process.env.VITE_APP_URL || 'https://subs.app'
      const inviteRes = await fetch('https://api.clerk.com/v1/invitations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          public_metadata: { role },
          redirect_url: `${appUrl}/admin/dashboard`,
        }),
      })
      const inviteData = await inviteRes.json()
      if (!inviteRes.ok) {
        const msg = inviteData?.errors?.[0]?.long_message || inviteData?.errors?.[0]?.message || 'Failed to send Clerk invitation'
        return res.status(500).json({ error: msg })
      }
      invitationId = inviteData.id
    }

    const { data, error } = await supabase
      .from('staff_members')
      .insert({ full_name, email, role, clerk_invitation_id: invitationId })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ staff: data })
  }

  if (req.method === 'PATCH') {
    const { id, role } = req.body || {}
    if (!id || !role) return res.status(400).json({ error: 'id and role required' })
    if (!['staff', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid role' })

    const { data: member } = await supabase
      .from('staff_members')
      .select('clerk_user_id')
      .eq('id', id)
      .single()

    if (member?.clerk_user_id) {
      const clerkKey = process.env.CLERK_SECRET_KEY
      if (clerkKey) {
        await fetch(`https://api.clerk.com/v1/users/${member.clerk_user_id}/metadata`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_metadata: { role } }),
        })
      }
    }

    const { error } = await supabase.from('staff_members').update({ role }).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (req.method === 'PUT') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id required' })

    const { data: member } = await supabase
      .from('staff_members')
      .select('email, role, clerk_invitation_id')
      .eq('id', id)
      .single()

    if (!member) return res.status(404).json({ error: 'Staff member not found' })

    const clerkKey = process.env.CLERK_SECRET_KEY
    if (!clerkKey) return res.status(500).json({ error: 'CLERK_SECRET_KEY not configured' })

    // Revoke the old invitation if we have one
    if (member.clerk_invitation_id) {
      await fetch(`https://api.clerk.com/v1/invitations/${member.clerk_invitation_id}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
      })
    }

    const appUrl = process.env.VITE_APP_URL || 'https://subs.app'
    const inviteRes = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clerkKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: member.email,
        public_metadata: { role: member.role },
        redirect_url: `${appUrl}/admin/dashboard`,
      }),
    })
    const inviteData = await inviteRes.json()
    if (!inviteRes.ok) {
      const msg = inviteData?.errors?.[0]?.long_message || inviteData?.errors?.[0]?.message || 'Failed to resend invitation'
      return res.status(500).json({ error: msg })
    }

    await supabase.from('staff_members').update({ clerk_invitation_id: inviteData.id }).eq('id', id)
    return res.status(200).json({ success: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabase.from('staff_members').update({ status: 'removed' }).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

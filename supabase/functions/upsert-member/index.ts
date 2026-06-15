import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { clerk_user_id, email, name, phone, zip } = await req.json()

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

    const { data } = await supabase
      .from('members')
      .insert({
        clerk_user_id,
        email: email || '',
        name: name || '',
        phone: phone || null,
        zip: zip || null,
        tier: 'Member',
        status: 'Active',
      })
      .select()
      .single()

    return new Response(JSON.stringify({ member: data, created: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('upsert-member error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

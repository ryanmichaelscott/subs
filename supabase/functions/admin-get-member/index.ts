import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { email, clerk_user_id } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let query = supabase.from('members').select('*')
  if (clerk_user_id) query = query.eq('clerk_user_id', clerk_user_id)
  else if (email) query = query.eq('email', email)
  else {
    return new Response(JSON.stringify({ error: 'email or clerk_user_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: member } = await query.single()
  return new Response(JSON.stringify({ member }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

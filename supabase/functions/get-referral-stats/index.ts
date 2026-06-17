import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { clerk_user_id } = await req.json()
    if (!clerk_user_id) return new Response(JSON.stringify({ error: 'clerk_user_id required' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: member } = await supabase
      .from('members')
      .select('id, referral_code')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (!member) return new Response(JSON.stringify({ error: 'Member not found' }), {
      status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    let referralCode = member.referral_code
    if (!referralCode) {
      // Generate a unique code, retry on collision
      for (let i = 0; i < 10; i++) {
        const candidate = generateCode()
        const { error } = await supabase
          .from('members')
          .update({ referral_code: candidate })
          .eq('id', member.id)
        if (!error) { referralCode = candidate; break }
      }
    }

    const { data: referrals } = await supabase
      .from('referrals')
      .select('referred_email, status, reward_applied, created_at, converted_at')
      .eq('referrer_member_id', member.id)
      .order('created_at', { ascending: false })

    const total = referrals?.length ?? 0
    const converted = referrals?.filter(r => r.status === 'converted').length ?? 0

    return new Response(JSON.stringify({
      referral_code: referralCode,
      referrals: referrals ?? [],
      total,
      converted,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('get-referral-stats error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

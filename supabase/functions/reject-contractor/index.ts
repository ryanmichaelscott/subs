import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rejectionEmail = (name: string) => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, system-ui, sans-serif; background: #f5f5f5; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px;">
    <div style="font-size: 20px; font-weight: 800; color: #1a1a1a; margin-bottom: 24px;">SUBS</div>
    <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 16px;">Hi ${name},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 16px;">
      Thank you for applying to join the SUBS contractor network. After reviewing your application,
      we're not able to move forward at this time.
    </p>
    <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 16px;">
      This could be due to current capacity in your trade or service area. We encourage you to
      reapply in the future as our network expands.
    </p>
    <p style="font-size: 15px; color: #555; line-height: 1.6;">
      Thanks again for your interest in SUBS.
    </p>
    <p style="font-size: 15px; color: #1a1a1a; margin-top: 32px;">— The SUBS Team</p>
  </div>
</body>
</html>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { contractor_id } = await req.json()
  if (!contractor_id) {
    return new Response(JSON.stringify({ error: 'contractor_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch contractor
  const { data: contractor, error: fetchError } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', contractor_id)
    .single()

  if (fetchError || !contractor) {
    return new Response(JSON.stringify({ error: 'Contractor not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Update status to rejected
  await supabase
    .from('contractors')
    .update({ status: 'rejected' })
    .eq('id', contractor_id)

  // Send rejection email via Resend if key is configured
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey && contractor.contact_email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SUBS <hello@subs.app>',
        to: contractor.contact_email,
        subject: 'Your SUBS contractor application',
        html: rejectionEmail(contractor.contact_name || 'there'),
      }),
    })
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

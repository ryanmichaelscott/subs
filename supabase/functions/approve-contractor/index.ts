import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  if (!contractor.contact_email) {
    return new Response(JSON.stringify({ error: 'Contractor has no email address' }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create Clerk invitation — sends a magic-link email to set password
  // and sets role metadata on the user when they accept
  const clerkRes = await fetch('https://api.clerk.com/v1/invitations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CLERK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: contractor.contact_email,
      public_metadata: { role: 'contractor' },
      notify: true,
    }),
  })

  const clerkData = await clerkRes.json()

  const isDuplicate = !clerkRes.ok &&
    clerkData?.errors?.some((e: any) => e.code === 'duplicate_record')

  if (!clerkRes.ok && !isDuplicate) {
    return new Response(
      JSON.stringify({ error: 'Failed to create Clerk invitation', details: clerkData }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Update contractor to approved and store the invitation ID
  const { error: updateError } = await supabase
    .from('contractors')
    .update({
      status: 'approved',
      clerk_invitation_id: clerkData.id,
    })
    .eq('id', contractor_id)

  if (updateError) {
    // Invitation was created — log the error but don't fail the request
    console.error('Failed to update contractor status:', updateError)
  }

  return new Response(
    JSON.stringify({ success: true, invitation_id: clerkData.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

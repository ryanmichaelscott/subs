import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { contractor_id } = await req.json()
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch contractor so we have the email for Clerk lookup
    const { data: contractor, error: fetchError } = await supabase
      .from('contractors')
      .select('id, contact_email, name')
      .eq('id', contractor_id)
      .single()

    if (fetchError || !contractor) {
      return new Response(JSON.stringify({ error: 'Contractor not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')
    let clerkDeleted = false

    // Delete Clerk user if one exists for this email
    if (clerkKey && contractor.contact_email) {
      const findRes = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(contractor.contact_email)}`,
        { headers: { 'Authorization': `Bearer ${clerkKey}` } },
      )

      if (findRes.ok) {
        const users = await findRes.json()
        // Response is an array of matching users
        const match = Array.isArray(users)
          ? users.find((u: any) => u.email_addresses?.some((e: any) => e.email_address === contractor.contact_email))
          : null

        if (match) {
          const deleteRes = await fetch(`https://api.clerk.com/v1/users/${match.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${clerkKey}` },
          })
          clerkDeleted = deleteRes.ok
          if (!deleteRes.ok) {
            const err = await deleteRes.json().catch(() => ({}))
            console.error('Clerk delete error:', JSON.stringify(err))
          }
        }
      }
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('contractors')
      .delete()
      .eq('id', contractor_id)

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ success: true, clerk_deleted: clerkDeleted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

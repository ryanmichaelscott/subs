import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { company_name, trades, contact_name, email, phone, service_area } = await req.json()

    if (!company_name?.trim() || !email?.trim() || !trades?.length) {
      return new Response(JSON.stringify({ error: 'Company name, email, and at least one trade are required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const normalizedEmail = email.toLowerCase().trim()

    // Reject duplicate applications
    const { data: existing } = await supabase
      .from('contractors')
      .select('id')
      .eq('contact_email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'An application with this email already exists.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create contractor record with status pending
    const { error: dbError } = await supabase.from('contractors').insert({
      name: company_name.trim(),
      trade: trades[0],
      trades,
      contact_name: contact_name?.trim() || '',
      contact_email: normalizedEmail,
      phone: phone?.trim() || '',
      service_area: service_area ? JSON.stringify(service_area) : null,
      status: 'pending',
    })

    if (dbError) throw new Error(dbError.message)

    // Create Clerk user account directly — enables OTP login immediately.
    // Invitations only create a pending state; the contractor can't sign in via OTP
    // until they have a real account. POST /v1/users creates it right away.
    const clerkKey = Deno.env.get('CLERK_SECRET_KEY')
    if (clerkKey) {
      const resp = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: [normalizedEmail],
          public_metadata: { role: 'contractor' },
          skip_password_requirement: true,
          skip_password_checks: true,
        }),
      })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        const alreadyExists = body?.errors?.some((e: any) =>
          e.code === 'form_identifier_exists' || e.code === 'duplicate_record'
        )
        if (!alreadyExists) console.error('Clerk user creation error:', body)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

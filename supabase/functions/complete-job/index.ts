import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { lead_notification_id, job_request_id, contractor_id } = await req.json()

    if (!lead_notification_id || !contractor_id) {
      return new Response(JSON.stringify({ error: 'lead_notification_id and contractor_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Update lead_notifications — drop+recreate constraint allows 'completed' (see schema note)
    // Using 'accepted' as a workaround isn't viable; we rely on the constraint being updated in SQL
    const { error: notifError } = await supabase
      .from('lead_notifications')
      .update({ status: 'completed', responded_at: new Date().toISOString() })
      .eq('id', lead_notification_id)
      .eq('contractor_id', contractor_id)

    if (notifError) throw new Error(`lead_notifications update failed: ${notifError.message}`)

    // Update job_requests — 'Complete' matches the existing DB constraint
    let memberEmail: string | null = null
    let memberName: string | null = null
    let contractorName: string | null = null
    let trade: string | null = null

    if (job_request_id) {
      const { error: jobError, data: jobRow } = await supabase
        .from('job_requests')
        .update({ status: 'Complete' })
        .eq('id', job_request_id)
        .select('member_email, member_name, clerk_user_id, trade')
        .single()

      if (jobError) throw new Error(`job_requests update failed: ${jobError.message}`)

      memberEmail = jobRow?.member_email || null
      memberName = jobRow?.member_name || null
      trade = jobRow?.trade || null

      // Fallback: look up member email from members table if not on job request
      if (!memberEmail && jobRow?.clerk_user_id) {
        const { data: member } = await supabase
          .from('members')
          .select('email, name')
          .eq('clerk_user_id', jobRow.clerk_user_id)
          .single()
        memberEmail = member?.email || null
        if (!memberName) memberName = member?.name || null
      }
    }

    // Get contractor name for the email
    const { data: contractor } = await supabase
      .from('contractors')
      .select('name, contact_name')
      .eq('id', contractor_id)
      .single()
    contractorName = contractor?.name || contractor?.contact_name || 'your contractor'

    // Send review request email to member
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && memberEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <noreply@subs.app>',
          to: memberEmail,
          subject: `How did your ${trade || 'job'} go? Leave a review`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0C0F0A;color:#F0EEE8">
              <div style="font-size:22px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;margin-bottom:24px">SUBS</div>
              <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Your ${trade || 'job'} is complete</h2>
              <p style="color:#8A9088;line-height:1.6;margin:0 0 24px">
                ${contractorName} has marked your ${trade ? trade.toLowerCase() : 'job'} as complete. How did it go?
                ${memberName ? `Hi ${memberName.split(' ')[0]}, ` : ''}leaving a quick review helps other SUBS members and rewards great contractors.
              </p>
              <a href="https://subs.app/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
                Leave a Review →
              </a>
              <p style="color:#8A9088;font-size:12px;margin-top:32px">
                Log in to your SUBS dashboard and open the History tab to rate your experience.
              </p>
            </div>
          `,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('complete-job error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

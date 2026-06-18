import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { token, score, reason } = await req.json()

    if (!token || score === undefined || score === null) {
      return new Response(JSON.stringify({ error: 'token and score required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const numScore = Number(score)
    if (!Number.isInteger(numScore) || numScore < 0 || numScore > 10) {
      return new Response(JSON.stringify({ error: 'score must be 0–10' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Validate token
    const { data: survey, error: surveyErr } = await supabase
      .from('nps_surveys_sent')
      .select('id, member_id, survey_type, responded_at')
      .eq('token', token)
      .single()

    if (surveyErr || !survey) {
      return new Response(JSON.stringify({ error: 'Invalid or expired survey link.' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (survey.responded_at) {
      return new Response(JSON.stringify({ success: true, already_responded: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Store response
    await supabase.from('nps_responses').insert({
      member_id: survey.member_id,
      score: numScore,
      reason: reason?.trim() || null,
      survey_type: survey.survey_type,
    })

    // Mark survey as responded
    await supabase
      .from('nps_surveys_sent')
      .update({ responded_at: new Date().toISOString() })
      .eq('id', survey.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('submit-nps-response error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

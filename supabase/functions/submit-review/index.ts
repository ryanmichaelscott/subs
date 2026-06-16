import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { job_request_id, contractor_id, clerk_user_id, rating, comment } = await req.json()

    if (!job_request_id || !contractor_id || !clerk_user_id || !rating) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Rating must be 1-5' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: reviewError } = await supabase
      .from('reviews')
      .upsert({
        job_request_id,
        contractor_id,
        clerk_user_id,
        rating,
        comment: comment || null,
      }, { onConflict: 'job_request_id,clerk_user_id' })

    if (reviewError) throw reviewError

    // Recalculate contractor aggregate rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('contractor_id', contractor_id)

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length
      await supabase
        .from('contractors')
        .update({ rating: Math.round(avg * 10) / 10, jobs_count: allReviews.length })
        .eq('id', contractor_id)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('submit-review error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

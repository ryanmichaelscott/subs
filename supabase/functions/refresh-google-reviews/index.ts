import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch all contractors with a Place ID
    const { data: contractors, error: fetchError } = await supabase
      .from('contractors')
      .select('id, google_place_id')
      .not('google_place_id', 'is', null)

    if (fetchError) throw fetchError

    if (!contractors?.length) {
      return new Response(JSON.stringify({ ok: true, updated: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let updated = 0
    let errors = 0

    for (const contractor of contractors) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(contractor.google_place_id)}&fields=rating,user_ratings_total&key=${apiKey}`
        )
        const data = await res.json()

        if (data.status !== 'OK') {
          console.error(`Place details error for ${contractor.id}: ${data.status}`)
          errors++
          continue
        }

        const rating = data.result?.rating ?? null
        const reviewCount = data.result?.user_ratings_total ?? null

        await supabase
          .from('contractors')
          .update({
            google_rating: rating,
            google_review_count: reviewCount,
            google_reviews_last_updated: new Date().toISOString(),
          })
          .eq('id', contractor.id)

        updated++
      } catch (err) {
        console.error(`Failed to refresh ${contractor.id}:`, err)
        errors++
      }
    }

    return new Response(JSON.stringify({ ok: true, updated, errors, total: contractors.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('refresh-google-reviews error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

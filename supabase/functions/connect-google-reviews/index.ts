import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Try to extract a Place ID directly from a Google Maps URL
function extractPlaceId(url: string): string | null {
  // ChIJ-style Place ID encoded in the data segment: !1sCHIJ...
  const dataMatch = url.match(/!1s(ChIJ[\w-]+)/)
  if (dataMatch) return dataMatch[1]
  // ?place_id= query param
  try {
    const p = new URL(url)
    const pid = p.searchParams.get('place_id')
    if (pid) return pid
  } catch {}
  return null
}

// Extract a searchable business name from a Google Maps URL
function extractName(url: string): string | null {
  try {
    const p = new URL(url)
    // /maps/place/BUSINESS+NAME/... — most common share format
    const pathMatch = p.pathname.match(/\/place\/([^/]+)/)
    if (pathMatch) return decodeURIComponent(pathMatch[1].replace(/\+/g, ' '))
    // ?q=QUERY
    const q = p.searchParams.get('q')
    if (q) return decodeURIComponent(q)
  } catch {}
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { contractor_id, google_maps_url } = body

    if (!contractor_id) {
      return new Response(JSON.stringify({ error: 'contractor_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Dismiss-only call — no URL provided
    if (!google_maps_url) {
      await supabase.from('contractors').update({ google_review_popup_dismissed: true }).eq('id', contractor_id)
      return new Response(JSON.stringify({ success: true, dismissed: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let placeId = extractPlaceId(google_maps_url)
    let rating: number | null = null
    let reviewCount: number | null = null
    let placeName: string | null = null

    if (placeId) {
      // Fetch details directly — we already have the Place ID
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total&key=${apiKey}`
      )
      const details = await detailsRes.json()
      if (details.status !== 'OK') {
        return new Response(JSON.stringify({ error: `Google Places error: ${details.status}` }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      rating = details.result?.rating ?? null
      reviewCount = details.result?.user_ratings_total ?? null
      placeName = details.result?.name ?? null
    } else {
      // Fall back to text search using the business name from URL
      const name = extractName(google_maps_url)
      if (!name) {
        return new Response(JSON.stringify({ error: 'Could not parse business name from URL. Try copying the URL directly from Google Maps.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&key=${apiKey}`
      )
      const search = await searchRes.json()
      if (search.status !== 'OK' || !search.results?.length) {
        return new Response(JSON.stringify({ error: 'No matching business found. Try a different URL.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const result = search.results[0]
      placeId = result.place_id
      rating = result.rating ?? null
      reviewCount = result.user_ratings_total ?? null
      placeName = result.name ?? null
    }

    const { error: dbError } = await supabase
      .from('contractors')
      .update({
        google_place_id: placeId,
        google_maps_url: google_maps_url,
        google_rating: rating,
        google_review_count: reviewCount,
        google_reviews_last_updated: new Date().toISOString(),
        google_review_popup_dismissed: true,
      })
      .eq('id', contractor_id)

    if (dbError) throw dbError

    return new Response(JSON.stringify({
      success: true,
      place_name: placeName,
      google_place_id: placeId,
      google_rating: rating,
      google_review_count: reviewCount,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('connect-google-reviews error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

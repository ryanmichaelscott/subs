import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const vercelUrl = Deno.env.get('VERCEL_APP_URL') || 'https://getsubs.co'

    // Generate Google Wallet pass first so the email can include both buttons
    let googleWalletUrl: string | null = null
    try {
      const googleRes = await fetch(`${vercelUrl}/api/wallet/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (googleRes.ok) {
        const googleData = await googleRes.json()
        googleWalletUrl = googleData.google_wallet_url || null
      } else {
        console.error('create-passkit-pass: google wallet error:', await googleRes.text())
      }
    } catch (googleErr) {
      console.error('create-passkit-pass: google wallet fetch failed:', (googleErr as Error).message)
    }

    const res = await fetch(`${vercelUrl}/api/wallet/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, mode: 'email', google_wallet_url: googleWalletUrl }),
    })

    const data = await res.json()

    return new Response(JSON.stringify({ ...data, google_wallet_url: googleWalletUrl }), {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-passkit-pass proxy error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

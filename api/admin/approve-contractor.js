import * as DropboxSign from '@dropbox/sign'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { contractor_id } = req.body || {}
  if (!contractor_id) return res.status(400).json({ error: 'contractor_id required' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch contractor
  const { data: contractor, error: fetchErr } = await supabase
    .from('contractors')
    .select('id, name, contact_name, contact_email, status')
    .eq('id', contractor_id)
    .single()

  if (fetchErr || !contractor) {
    return res.status(404).json({ error: 'Contractor not found' })
  }

  if (!contractor.contact_email) {
    return res.status(422).json({ error: 'Contractor has no email address' })
  }

  // ── Step 1: Run existing approval logic (Clerk invite + status + approval email) ──
  const supabaseFnUrl = `${supabaseUrl}/functions/v1/approve-contractor`
  const fnRes = await fetch(supabaseFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ contractor_id }),
  })

  const fnData = await fnRes.json()
  if (!fnRes.ok || fnData.error) {
    const msg = fnData?.error || `approve-contractor function failed (${fnRes.status})`
    console.error('approve-contractor fn error:', msg)
    return res.status(500).json({ error: msg })
  }

  // ── Step 2: Send Dropbox Sign signature request ────────────────────────────
  const dropboxApiKey = process.env.DROPBOX_SIGN_API_KEY
  const templateId = process.env.DROPBOX_SIGN_TEMPLATE_ID || '1b10b1ac43d1e83b9a8838fcb1c68a2b6596527a'
  const clientId = process.env.DROPBOX_SIGN_CLIENT_ID || '996486391387eff8bf56a87d558ca447'

  if (!dropboxApiKey) {
    console.error('DROPBOX_SIGN_API_KEY not configured — skipping e-signature')
    return res.status(200).json({ success: true, warning: 'DROPBOX_SIGN_API_KEY not set' })
  }

  let signatureRequestId = null
  try {
    const signApi = new DropboxSign.SignatureRequestApi()
    signApi.username = dropboxApiKey

    const signerName = contractor.contact_name || contractor.name
    const result = await signApi.signatureRequestSendWithTemplate({
      templateIds: [templateId],
      clientId,
      subject: 'Your SUBS Contractor Agreement',
      message: 'Please review and sign your SUBS Contractor Agreement to complete your onboarding.',
      signers: [
        {
          // 'role' must match the signer role name defined in your Dropbox Sign template
          role: 'Contractor',
          name: signerName,
          emailAddress: contractor.contact_email,
        },
      ],
      testMode: process.env.NODE_ENV !== 'production',
    })

    signatureRequestId = result.body?.signatureRequest?.signatureRequestId ?? null
  } catch (signErr) {
    console.error('Dropbox Sign error:', signErr?.message || signErr)
    // Non-fatal — approval already succeeded, just log and continue
    return res.status(200).json({
      success: true,
      warning: `Contractor approved but e-signature request failed: ${signErr?.message}`,
    })
  }

  // ── Step 3: Store signature_request_id on contractor ──────────────────────
  if (signatureRequestId) {
    const { error: updateErr } = await supabase
      .from('contractors')
      .update({ dropbox_sign_request_id: signatureRequestId })
      .eq('id', contractor_id)

    if (updateErr) {
      console.error('Failed to store dropbox_sign_request_id:', updateErr.message)
    }
  }

  return res.status(200).json({
    success: true,
    invitation_id: fnData.invitation_id,
    signature_request_id: signatureRequestId,
  })
}

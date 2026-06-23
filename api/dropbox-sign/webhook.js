import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Dropbox Sign webhook verification:
// event_hash = HMAC-SHA256(api_key, event_time + event_type)
function isValidDropboxSignEvent(apiKey, event) {
  if (!apiKey || !event?.event_time || !event?.event_type || !event?.event_hash) return false
  const expected = crypto
    .createHmac('sha256', apiKey)
    .update(event.event_time + event.event_type)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(event.event_hash))
}

async function sendSignedConfirmationEmail(resendKey, contractor) {
  const name = contractor.contact_name || contractor.name || 'there'
  const firstName = name.split(' ')[0]
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0C0F0A;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr><td align="center" style="padding:40px 16px 48px;">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <tr><td style="padding-bottom:24px;">
    <div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;">SUBS</div>
    <div style="height:1px;background:#252A23;margin-top:16px;"></div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Agreement Signed</div>
    <h1 style="font-size:28px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.2;">You're official, ${firstName}.</h1>
    <p style="font-size:15px;color:#8A9088;line-height:1.7;margin:0;">Your SUBS Contractor Agreement has been signed and recorded. You're now a verified SUBS partner — log in to complete your profile and start receiving pre-qualified homeowners in your area.</p>
  </td></tr>
  <tr><td style="padding-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0A1A0F;border:1px solid #1A3A20;border-radius:14px;">
      <tr><td style="padding:20px 24px;">
        <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">What's next</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${['Complete your contractor profile — add your bio, rates, and service area', 'Activate your SUBS partner subscription', 'Start receiving job leads from vetted SUBS members in your area'].map((step, i) => `
          <tr><td style="padding-bottom:${i < 2 ? '10' : '0'}px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="22" style="vertical-align:top;padding-top:1px;"><div style="width:16px;height:16px;border-radius:50%;background:#5DFF8A;color:#0C0F0A;font-size:10px;font-weight:800;text-align:center;line-height:16px;">${i + 1}</div></td>
              <td style="padding-left:10px;font-size:13px;color:#8A9088;line-height:1.5;">${step}</td>
            </tr></table>
          </td></tr>`).join('')}
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding-bottom:32px;">
    <a href="https://subs.app/contractor/login" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none;">Log in to your dashboard →</a>
  </td></tr>
  <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
  <tr><td style="padding-top:20px;">
    <div style="font-size:12px;color:#8A9088;line-height:1.8;">Questions? <a href="mailto:partners@subs.app" style="color:#5DFF8A;text-decoration:none;">partners@subs.app</a> or call <span style="color:#F0EEE8;">1-888-454-3019</span></div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SUBS <hello@subs.app>',
      to: contractor.contact_email,
      subject: "Your SUBS Contractor Agreement is signed — you're official",
      html,
    }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Dropbox Sign sends form-encoded body with a 'json' field,
  // or raw JSON depending on webhook config. Handle both.
  let payload
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody)
      payload = JSON.parse(params.get('json') || '{}')
    } else {
      payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody)
    }
  } catch {
    return res.status(400).send('Hello API Event Received')
  }

  const event = payload?.event
  if (!event) return res.status(400).send('Hello API Event Received')

  // Verify the event signature
  const apiKey = process.env.DROPBOX_SIGN_API_KEY
  if (apiKey && !isValidDropboxSignEvent(apiKey, event)) {
    console.error('Invalid Dropbox Sign event signature')
    return res.status(401).send('Hello API Event Received')
  }

  // Only act on fully-signed events
  if (event.event_type !== 'signature_request_all_signed') {
    return res.status(200).send('Hello API Event Received')
  }

  const signatureRequestId = event.signature_request?.signature_request_id
  if (!signatureRequestId) return res.status(200).send('Hello API Event Received')

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    // Find contractor by signature request ID
    const { data: contractor, error: findErr } = await supabase
      .from('contractors')
      .select('id, name, contact_name, contact_email')
      .eq('dropbox_sign_request_id', signatureRequestId)
      .single()

    if (findErr || !contractor) {
      console.error('No contractor found for signature_request_id:', signatureRequestId)
      return res.status(200).send('Hello API Event Received')
    }

    // Update status to docs_signed
    await supabase
      .from('contractors')
      .update({ status: 'docs_signed' })
      .eq('id', contractor.id)

    // Send confirmation email
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && contractor.contact_email) {
      await sendSignedConfirmationEmail(resendKey, contractor)
    }
  } catch (err) {
    console.error('Dropbox Sign webhook error:', err?.message)
  }

  // Dropbox Sign requires this exact response body
  return res.status(200).send('Hello API Event Received')
}

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Validate Twilio's request signature so only Twilio can POST here.
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
function twilioSignatureValid(authToken, url, params, signature) {
  if (!authToken || !signature) return false
  const sortedKeys = Object.keys(params).sort()
  const data = url + sortedKeys.map(k => k + params[k]).join('')
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = req.headers['x-twilio-signature'] ?? ''
  const url = `https://${req.headers.host}/api/twilio/status`

  if (authToken && !twilioSignatureValid(authToken, url, req.body ?? {}, signature)) {
    return res.status(403).json({ error: 'Invalid Twilio signature' })
  }

  const {
    MessageSid,
    MessageStatus,
    To,
    From,
    ErrorCode,
    ErrorMessage,
    AccountSid,
  } = req.body ?? {}

  if (!MessageSid || !MessageStatus) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const { error } = await supabase.from('sms_logs').insert({
      message_sid: MessageSid,
      status: MessageStatus,
      to_phone: To ?? null,
      from_phone: From ?? null,
      error_code: ErrorCode ?? null,
      error_message: ErrorMessage ?? null,
      account_sid: AccountSid ?? null,
    })

    if (error) {
      console.error('sms_logs insert error:', error.message)
    }
  } catch (err) {
    // Don't let a DB error cause Twilio to retry — log and return 200
    console.error('sms_logs handler error:', err)
  }

  // Twilio requires a 200 response; empty body is fine
  res.status(200).end()
}

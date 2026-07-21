import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const TIER_COLORS = { 'Member': '#5DFF8A', 'Member+': '#5B8DEF', 'Elite': '#C084FC' }

function makeGoogleWalletUrl({ serviceAccount, issuerId, classId, memberId, name, tier, expiryStr }) {
  const objectSuffix = memberId.replace(/[^a-zA-Z0-9_-]/g, '_')

  const passObject = {
    id: `${issuerId}.${objectSuffix}`,
    classId: `${issuerId}.${classId}`,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    hexBackgroundColor: '#10382A',
    logo: {
      sourceUri: { uri: 'https://www.subs.app/icons/icon-512.png?v=4' },
      contentDescription: { defaultValue: { language: 'en-US', value: 'SUBS' } },
    },
    cardTitle: { defaultValue: { language: 'en-US', value: 'SUBS' } },
    header: { defaultValue: { language: 'en-US', value: name } },
    subheader: { defaultValue: { language: 'en-US', value: tier } },
    textModulesData: [
      { id: 'member_id',    header: 'MEMBER ID',     body: memberId },
      { id: 'valid_through', header: 'VALID THROUGH', body: expiryStr },
      { id: 'concierge',   header: 'CONCIERGE',      body: '1-888-454-3019' },
    ],
    state: 'ACTIVE',
  }

  const jwtPayload = {
    iss: serviceAccount.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericClasses: [{ id: `${issuerId}.${classId}` }],
      genericObjects: [passObject],
    },
    origins: ['https://subs.app'],
  }

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url')
  const sigInput = `${header}.${payload}`

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(sigInput)
  const sig = sign.sign(serviceAccount.private_key, 'base64url')

  return `https://pay.google.com/gp/v/save/${sigInput}.${sig}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  console.log('[wallet/google] invoked')

  try {
    const { clerk_user_id, name, email, tier } = req.body || {}
    if (!clerk_user_id || !email || !tier) {
      return res.status(400).json({ error: 'clerk_user_id, email, and tier are required' })
    }

    const saB64    = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID  || '3388000000023149416'
    const classId  = process.env.GOOGLE_WALLET_CLASS_ID   || 'SUBS_Membership_Card'

    if (!saB64) {
      return res.status(500).json({ error: 'GOOGLE_WALLET_SERVICE_ACCOUNT not configured' })
    }

    let serviceAccount
    try {
      serviceAccount = JSON.parse(Buffer.from(saB64, 'base64').toString('utf-8'))
    } catch {
      return res.status(500).json({ error: 'GOOGLE_WALLET_SERVICE_ACCOUNT is not valid base64 JSON' })
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return res.status(500).json({ error: 'Service account missing client_email or private_key' })
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, joined_at')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found', detail: memberError?.message })
    }

    const { count: memberPos } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .lte('joined_at', member.joined_at)

    const joinedAt = new Date(member.joined_at || Date.now())
    const year     = joinedAt.getFullYear()
    const memberId = `SUB-${year}-${String(memberPos || 1).padStart(5, '0')}`
    const expiry   = new Date(joinedAt)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const expiryStr = expiry.toISOString().split('T')[0]

    console.log('[wallet/google] generating pass for', memberId, tier)

    const googleWalletUrl = makeGoogleWalletUrl({
      serviceAccount, issuerId, classId,
      memberId, name: name || email, tier, expiryStr,
    })

    await supabase
      .from('members')
      .update({ google_pass_url: googleWalletUrl })
      .eq('clerk_user_id', clerk_user_id)

    console.log('[wallet/google] success, URL length:', googleWalletUrl.length)

    return res.status(200).json({ success: true, google_wallet_url: googleWalletUrl, memberId })

  } catch (err) {
    console.error('[wallet/google] error:', err?.message, '\n', err?.stack)
    return res.status(500).json({ error: err?.message })
  }
}

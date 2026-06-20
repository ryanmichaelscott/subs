import { createClient } from '@supabase/supabase-js'
import { Template } from '@walletpass/pass-js'
import { deflateSync } from 'node:zlib'

const TIER_LABEL_COLOR = {
  'Member':  'rgb(93,255,138)',
  'Member+': 'rgb(91,141,239)',
  'Elite':   'rgb(192,132,252)',
}

// Minimal pure-Node.js solid-color PNG generator (no canvas needed)
function makeSolidPNG(w, h, r, g, b) {
  const crcTable = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[i] = c
  }
  function crc32(buf) {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const t = Buffer.from(type)
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([l, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  const rows = []
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3)
    row[0] = 0 // filter: None
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b
    }
    rows.push(row)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function emailHtml(name, tier, memberId, expiryStr) {
  const badgeColor = { Member: '#5DFF8A', 'Member+': '#5B8DEF', Elite: '#C084FC' }[tier] || '#5DFF8A'
  const firstName = name ? name.split(' ')[0] : null
  const expiryDisplay = new Date(expiryStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0F0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0C0F0A;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101410;border:1px solid #252A23;border-radius:14px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid #252A23;">
          <table width="100%"><tr>
            <td><span style="font-size:17px;font-weight:800;color:#5DFF8A;letter-spacing:0.06em;">SUBS</span></td>
            <td align="right"><span style="background:${badgeColor}22;color:${badgeColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid ${badgeColor}44;display:inline-block;">${tier}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 16px;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#F0EEE8;line-height:1.2;">Your membership card is ready${firstName ? `, ${firstName}` : ''}.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8A9088;line-height:1.7;">Open this email on your iPhone and tap the <strong style="color:#F0EEE8;">subs-membership.pkpass</strong> attachment below to add your card to Apple Wallet. Show it to your contractor to receive member pricing.</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <div style="background:#141814;border:1px solid #252A23;border-left:3px solid #5DFF8A;border-radius:8px;padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:0.08em;">On iPhone</p>
            <p style="margin:0;font-size:13px;color:#F0EEE8;line-height:1.6;">Tap the <strong>subs-membership.pkpass</strong> attachment in this email — iOS will open Apple Wallet automatically.</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" style="background:#141814;border:1px solid #252A23;border-radius:10px;overflow:hidden;">
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:.08em;width:110px;">Member</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${name}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:.08em;">Member ID</td>
              <td style="padding:12px 16px;font-size:13px;color:#F0EEE8;font-family:monospace;">${memberId}</td>
            </tr>
            <tr style="border-bottom:1px solid #252A23;">
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:.08em;">Plan</td>
              <td style="padding:12px 16px;font-size:14px;color:${badgeColor};font-weight:700;">${tier}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:.08em;">Valid through</td>
              <td style="padding:12px 16px;font-size:14px;color:#F0EEE8;">${expiryDisplay}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <a href="https://getsubs.co/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:8px;text-decoration:none;">Go to my dashboard →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
          <p style="margin:0;font-size:12px;color:#8A9088;">Questions? Call or text <a href="tel:18884543019" style="color:#8A9088;">1-888-454-3019</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  console.log('[wallet/generate] invoked')

  try {
    const { clerk_user_id, name, email, tier } = req.body || {}
    if (!clerk_user_id || !email || !tier) {
      return res.status(400).json({ error: 'clerk_user_id, email, and tier are required' })
    }

    // Env vars — cert and key are base64-encoded PEM strings
    const certPemB64      = process.env.APPLE_PASS_CERT_PEM
    const keyPemB64       = process.env.APPLE_PASS_KEY_PEM
    const keyPassword     = process.env.APPLE_PASS_KEY_PASSWORD || ''
    const teamId          = process.env.APPLE_TEAM_IDENTIFIER
    const passTypeId      = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.app.subs.membership'
    const supabaseUrl     = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey     = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendKey       = process.env.RESEND_API_KEY

    console.log('[wallet/generate] env:', JSON.stringify({
      APPLE_PASS_CERT_PEM: !!certPemB64,
      APPLE_PASS_KEY_PEM: !!keyPemB64,
      APPLE_TEAM_IDENTIFIER: !!teamId,
      APPLE_PASS_TYPE_IDENTIFIER: !!passTypeId,
      SUPABASE: !!(supabaseUrl && supabaseKey),
      RESEND: !!resendKey,
    }))

    if (!certPemB64)  return res.status(500).json({ error: 'APPLE_PASS_CERT_PEM not configured' })
    if (!keyPemB64)   return res.status(500).json({ error: 'APPLE_PASS_KEY_PEM not configured' })
    if (!teamId)      return res.status(500).json({ error: 'APPLE_TEAM_IDENTIFIER not configured' })
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' })

    const certPem = Buffer.from(certPemB64, 'base64').toString('utf-8')
    const keyPem  = Buffer.from(keyPemB64,  'base64').toString('utf-8')

    // Look up member
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, joined_at')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (memberError || !member) {
      console.error('[wallet/generate] member lookup:', memberError?.message)
      return res.status(404).json({ error: 'Member not found', detail: memberError?.message })
    }

    // Sequential member position for the ID
    const { count: memberPos } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .lte('joined_at', member.joined_at)

    const joinedAt = member.joined_at ? new Date(member.joined_at) : new Date()
    const year     = joinedAt.getFullYear()
    const memberId = `SUB-${year}-${String(memberPos || 1).padStart(5, '0')}`
    const expiry   = new Date(joinedAt)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const expiryStr = expiry.toISOString().split('T')[0]

    console.log('[wallet/generate] memberId:', memberId, 'tier:', tier)

    // Build images: dark icon, green logo
    const BG = [12, 15, 10]       // #0C0F0A
    const GREEN = [93, 255, 138]  // #5DFF8A

    const icon1x = makeSolidPNG(29, 29, ...BG)
    const icon2x = makeSolidPNG(58, 58, ...BG)
    const logo1x = makeSolidPNG(160, 50, ...GREEN)
    const logo2x = makeSolidPNG(320, 100, ...GREEN)

    // Build pass template
    console.log('[wallet/generate] building Template')
    const template = new Template('generic', {
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      organizationName: 'SUBS',
      description: 'SUBS Membership Card',
      backgroundColor: 'rgb(12,15,10)',
      labelColor: TIER_LABEL_COLOR[tier] || 'rgb(93,255,138)',
      foregroundColor: 'rgb(240,238,232)',
      logoText: 'SUBS',
    })

    template.setCertificate(certPem, keyPassword || undefined)
    template.setPrivateKey(keyPem, keyPassword || undefined)

    // Create the individual pass
    const pass = template.createPass({ serialNumber: memberId })

    // Add images
    await pass.images.add('icon', icon1x, '1x')
    await pass.images.add('icon', icon2x, '2x')
    await pass.images.add('logo', logo1x, '1x')
    await pass.images.add('logo', logo2x, '2x')

    // Pass fields
    pass.headerFields.add({ key: 'tier', label: 'TIER', value: tier, textAlignment: 'PKTextAlignmentRight' })
    pass.primaryFields.add({ key: 'member', label: 'MEMBER', value: name || email })
    pass.secondaryFields.add({ key: 'member_id', label: 'MEMBER ID', value: memberId })
    pass.auxiliaryFields.add({ key: 'expires', label: 'EXPIRES', value: expiryStr })
    pass.backFields.add({ key: 'support', label: 'SUPPORT', value: '1-888-454-3019' })
    pass.backFields.add({ key: 'website', label: 'WEBSITE', value: 'getsubs.co' })

    console.log('[wallet/generate] generating .pkpass buffer')
    const passBuffer = await pass.asBuffer()
    console.log('[wallet/generate] .pkpass size:', passBuffer.length, 'bytes')

    // Send email with .pkpass attachment — iOS will offer "Add to Apple Wallet" when tapped
    let emailSent = false
    if (resendKey) {
      console.log('[wallet/generate] sending email to', email)
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: email,
          subject: `Your SUBS ${tier} membership card`,
          html: emailHtml(name || email, tier, memberId, expiryStr),
          attachments: [{
            filename: 'subs-membership.pkpass',
            content: passBuffer.toString('base64'),
          }],
        }),
      })
      if (emailRes.ok) {
        emailSent = true
        console.log('[wallet/generate] email sent')
      } else {
        console.error('[wallet/generate] Resend error:', await emailRes.text())
      }
    }

    // Mark pass as issued in DB
    await supabase
      .from('members')
      .update({ passkit_pass_url: `apple-wallet:${memberId}` })
      .eq('clerk_user_id', clerk_user_id)

    return res.status(200).json({ success: true, memberId, emailSent })

  } catch (err) {
    const cause = err?.cause?.message || err?.cause?.code || String(err?.cause || '')
    console.error('[wallet/generate] exception:', err?.message, '| cause:', cause, '\n', err?.stack)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message, cause })
  }
}

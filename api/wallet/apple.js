import forge from 'node-forge'
import { Template } from '@walletpass/pass-js'
import { deflateSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const TIER_LABEL_COLOR = {
  'Member':  'rgb(93,255,138)',
  'Member+': 'rgb(91,141,239)',
  'Elite':   'rgb(192,132,252)',
}

const TIER_ACCENT_RGB = {
  'Member':  [93, 255, 138],
  'Member+': [91, 141, 239],
  'Elite':   [192, 132, 252],
}

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
  ihdr[8] = 8; ihdr[9] = 2
  const rows = []
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3)
    row[0] = 0
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b
    }
    rows.push(row)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function extractPemFromP12(p12Buffer, password) {
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '')

  let certPem = null
  let keyPem = null

  for (const sc of p12.safeContents) {
    for (const bag of sc.safeBags) {
      if (bag.type === forge.pki.oids.certBag && bag.cert) {
        const cn = bag.cert.subject.getField('CN')?.value || ''
        if (cn.toLowerCase().includes('pass type') || !certPem) {
          certPem = forge.pki.certificateToPem(bag.cert)
        }
      }
      if (
        (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag ||
          bag.type === forge.pki.oids.keyBag) &&
        bag.key
      ) {
        keyPem = forge.pki.privateKeyToPem(bag.key)
      }
    }
  }

  if (!certPem) throw new Error('Could not extract signing certificate from P12')
  if (!keyPem) throw new Error('Could not extract private key from P12')
  return { certPem, keyPem }
}

function emailHtml(name, tier, memberId, expiryStr) {
  const badgeColor = { Member: '#5DFF8A', 'Member+': '#5B8DEF', Elite: '#C084FC' }[tier] || '#5DFF8A'
  const firstName = name ? name.split(' ')[0] : null
  const expiryDisplay = new Date(expiryStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  return `<!DOCTYPE html><html>
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
    <p style="margin:0 0 24px;font-size:14px;color:#8A9088;line-height:1.7;">Open this email on your iPhone and tap the <strong style="color:#F0EEE8;">subs-membership.pkpass</strong> attachment to add your card to Apple Wallet instantly.</p>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <div style="background:#141814;border:1px solid #252A23;border-left:3px solid #5DFF8A;border-radius:8px;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#F0EEE8;line-height:1.6;">Show this card to your SUBS contractor to receive member pricing on all home services.</p>
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
    <a href="https://subs.app/dashboard" style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:8px;text-decoration:none;">Go to my dashboard &#x2192;</a>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #252A23;">
    <p style="margin:0;font-size:12px;color:#8A9088;">Questions? Call or text <a href="tel:18884543019" style="color:#8A9088;">1-888-454-3019</a> or email <a href="mailto:support@subs.app" style="color:#8A9088;">support@subs.app</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  console.log('[wallet/apple] invoked')

  try {
    const { clerk_user_id, name, email, tier, mode = 'email' } = req.body || {}
    if (!clerk_user_id || !email || !tier) {
      return res.status(400).json({ error: 'clerk_user_id, email, and tier are required' })
    }

    const p12B64      = process.env.APPLE_PASS_CERTIFICATE
    const p12Password = process.env.APPLE_PASS_CERTIFICATE_PASSWORD || ''
    const teamId      = process.env.APPLE_TEAM_IDENTIFIER || 'MJ342J5B69'
    const passTypeId  = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.app.subs.membership'
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendKey   = process.env.RESEND_API_KEY

    if (!p12B64) return res.status(500).json({ error: 'APPLE_PASS_CERTIFICATE not configured' })
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' })

    console.log('[wallet/apple] parsing P12')
    const { certPem, keyPem } = extractPemFromP12(Buffer.from(p12B64, 'base64'), p12Password)

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('id, joined_at')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (memberErr || !member) {
      return res.status(404).json({ error: 'Member not found', detail: memberErr?.message })
    }

    const { count: memberPos } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .lte('joined_at', member.joined_at)

    const joinedAt = member.joined_at ? new Date(member.joined_at) : new Date()
    const year = joinedAt.getFullYear()
    const memberId = `SUB-${year}-${String(memberPos || 1).padStart(5, '0')}`
    const expiry = new Date(joinedAt)
    expiry.setFullYear(expiry.getFullYear() + 1)
    const expiryStr = expiry.toISOString().split('T')[0]

    console.log('[wallet/apple] building pass, tier:', tier, 'memberId:', memberId)

    const BG = [12, 15, 10]
    const accent = TIER_ACCENT_RGB[tier] || [93, 255, 138]

    const icon1x = makeSolidPNG(29, 29, ...BG)
    const icon2x = makeSolidPNG(58, 58, ...BG)
    const icon3x = makeSolidPNG(87, 87, ...BG)
    const logo1x = makeSolidPNG(160, 50, ...accent)
    const logo2x = makeSolidPNG(320, 100, ...accent)

    const template = new Template('storeCard', {
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      organizationName: 'SUBS',
      description: 'SUBS Membership Card',
      backgroundColor: 'rgb(12,15,10)',
      labelColor: TIER_LABEL_COLOR[tier] || 'rgb(93,255,138)',
      foregroundColor: 'rgb(240,238,232)',
      logoText: 'SUBS',
    })

    template.setCertificate(certPem, p12Password || undefined)
    template.setPrivateKey(keyPem, p12Password || undefined)

    const pass = template.createPass({ serialNumber: memberId })

    await pass.images.add('icon', icon1x, '1x')
    await pass.images.add('icon', icon2x, '2x')
    await pass.images.add('icon', icon3x, '3x')
    await pass.images.add('logo', logo1x, '1x')
    await pass.images.add('logo', logo2x, '2x')

    pass.primaryFields.add({ key: 'name', label: 'MEMBER', value: name || email })
    pass.secondaryFields.add({ key: 'tier', label: 'TIER', value: tier })
    pass.secondaryFields.add({ key: 'member_id', label: 'MEMBER ID', value: memberId })
    pass.auxiliaryFields.add({ key: 'expires', label: 'VALID THROUGH', value: expiryStr })
    pass.auxiliaryFields.add({ key: 'concierge', label: 'CONCIERGE', value: '1-888-454-3019' })
    pass.backFields.add({ key: 'website', label: 'WEBSITE', value: 'subs.app' })
    pass.backFields.add({ key: 'email_support', label: 'EMAIL', value: 'support@subs.app' })
    pass.backFields.add({ key: 'usage', label: 'HOW TO USE', value: 'Show this card to receive member pricing on all home services' })
    pass.backFields.add({ key: 'terms', label: 'TERMS', value: 'Valid for one household. Non-transferable.' })

    console.log('[wallet/apple] generating .pkpass buffer')
    const passBuffer = await pass.asBuffer()
    console.log('[wallet/apple] .pkpass size:', passBuffer.length, 'bytes')

    // Store marker on member record
    await supabase
      .from('members')
      .update({ apple_pass_url: memberId })
      .eq('clerk_user_id', clerk_user_id)

    if (mode === 'download') {
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
      res.setHeader('Content-Disposition', 'attachment; filename="subs-membership.pkpass"')
      return res.status(200).send(passBuffer)
    }

    // Email mode — send .pkpass as attachment
    let emailSent = false
    if (resendKey && email) {
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
      emailSent = emailRes.ok
      if (!emailRes.ok) console.error('[wallet/apple] Resend error:', await emailRes.text())
    }

    return res.status(200).json({ success: true, memberId, emailSent })

  } catch (err) {
    console.error('[wallet/apple] error:', err?.message, '\n', err?.stack)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message })
  }
}

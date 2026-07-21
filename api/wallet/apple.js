import forge from 'node-forge'
import { Template } from '@walletpass/pass-js'
import { deflateSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

// Cream + antique gold on the deep-green card, matching the SUBS rebrand
const TIER_LABEL_COLOR = {
  'Free':    'rgb(194,165,92)',
  'Member':  'rgb(194,165,92)',
  'Full':    'rgb(194,165,92)',
  'Member+': 'rgb(194,165,92)',
  'Elite':   'rgb(194,165,92)',
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

// Logo embedded at correct densities (max 160px wide at 1x per Apple Wallet spec)
const LOGO_1X = Buffer.from('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', 'base64')
const LOGO_2X = Buffer.from('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', 'base64')
const LOGO_3X = Buffer.from('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6pX9TAfx73qJdfjHppu5YiTHbLiqSO+RC/TXBdVqYSe1bz+p131QpzXL3jHpGPiyRJo/ghzPmweeb63GMqBiceP8wpnMmk5L2hoBJKocoVbe/vrzMp2oLSGvpzS+N6JfaETomuF09nt6LttlTJHABHNqa6f2FXIPJZc12m6CfV0I9vzKj4dViK7RQeCLrat4gH7QKFxRLP5NbDMaNuUtO+bfNmuXXZp7px6/r94fL261Vb8JrvaJP2n72/VmudLMZAlsVoRu+xihr1bz29FcbDtidzu1A7dlh8bUP7dKn32CXOdxiseWJ5OLVmzOiX00+r5b3aWX6WfwHB2IJvSLGNevY4nMV2IxGx5W6s06xY7kXXHuSabHb1yIpaoWIkboZ4qrlopTf564sl2jviXLiPaRSQ0SPs6O89hQfWR5b5tqwCDQ/8kpAACApoRabRgAAIB3INAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBRINAAABBR/h8AAP//MvgBJwAAAAZJREFUAwA4Z+vtrVTSZwAAAABJRU5ErkJggg==', 'base64')

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

function emailHtml(name, tier, memberId, expiryStr, googleWalletUrl = null) {
  const badgeColor = { Free: '#175A41', Member: '#175A41', Full: '#175A41', 'Member+': '#35608F', Elite: '#6E5A8E' }[tier] || '#175A41'
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
    <p style="margin:0 0 24px;font-size:14px;color:#8A9088;line-height:1.7;">${googleWalletUrl ? 'On iPhone, tap the <strong style="color:#F0EEE8;">subs-membership.pkpass</strong> attachment below to add to Apple Wallet. On Android, use the Google Wallet button below.' : 'Open this email on your iPhone and tap the <strong style="color:#F0EEE8;">subs-membership.pkpass</strong> attachment to add your card to Apple Wallet instantly.'}</p>
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
  ${googleWalletUrl ? `<tr><td style="padding:0 32px 16px;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#8A9088;text-transform:uppercase;letter-spacing:.08em;">Android / Google Wallet</p>
    <a href="${googleWalletUrl}" style="display:inline-block;background:#4285F4;color:#ffffff;font-size:14px;font-weight:600;padding:13px 24px;border-radius:8px;text-decoration:none;">Add to Google Wallet &#x2192;</a>
  </td></tr>` : ''}
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

  console.log('[wallet/apple] invoked, logo sizes (1x/2x/3x):', LOGO_1X.length, LOGO_2X.length, LOGO_3X.length)

  try {
    const { clerk_user_id, name, email, tier, mode = 'email', google_wallet_url } = req.body || {}
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

    console.log('[wallet/apple] env check:', JSON.stringify({
      APPLE_PASS_CERTIFICATE: p12B64 ? `set (${p12B64.length} chars)` : 'MISSING',
      APPLE_PASS_CERTIFICATE_PASSWORD: p12Password ? 'set' : 'empty',
      APPLE_TEAM_IDENTIFIER: teamId,
      APPLE_PASS_TYPE_IDENTIFIER: passTypeId,
      supabase: !!(supabaseUrl && supabaseKey),
      resend: !!resendKey,
    }))

    if (!p12B64) return res.status(500).json({ error: 'APPLE_PASS_CERTIFICATE not configured' })
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' })

    // ── Step 1: Parse P12 certificate ────────────────────────────────────────
    console.log('[wallet/apple] step 1: parsing P12')
    let certPem, keyPem
    try {
      ;({ certPem, keyPem } = extractPemFromP12(Buffer.from(p12B64, 'base64'), p12Password))
      console.log('[wallet/apple] P12 parsed OK, cert length:', certPem.length, 'key length:', keyPem.length)
    } catch (e) {
      console.error('[wallet/apple] P12 parse failed:', e.message)
      return res.status(500).json({ error: 'Failed to parse Apple pass certificate', detail: e.message })
    }

    // ── Step 2: Look up member ────────────────────────────────────────────────
    console.log('[wallet/apple] step 2: supabase member lookup')
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('id, joined_at')
      .eq('clerk_user_id', clerk_user_id)
      .single()

    if (memberErr || !member) {
      console.error('[wallet/apple] member not found:', memberErr?.message)
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
    console.log('[wallet/apple] memberId:', memberId, 'tier:', tier)

    // ── Step 3: Build pass template ───────────────────────────────────────────
    console.log('[wallet/apple] step 3: building Template')
    let template, pass
    try {
      const BG = [12, 15, 10]
      const icon1x = makeSolidPNG(29, 29, ...BG)
      const icon2x = makeSolidPNG(58, 58, ...BG)
      const icon3x = makeSolidPNG(87, 87, ...BG)

      template = new Template('storeCard', {
        passTypeIdentifier: passTypeId,
        teamIdentifier: teamId,
        organizationName: 'SUBS',
        description: 'SUBS Membership Card',
        backgroundColor: 'rgb(16,56,42)',
        labelColor: TIER_LABEL_COLOR[tier] || 'rgb(93,255,138)',
        foregroundColor: 'rgb(247,243,233)',
        logoText: '',
      })
      console.log('[wallet/apple] Template created')

      template.setCertificate(certPem, p12Password || undefined)
      console.log('[wallet/apple] setCertificate OK')
      template.setPrivateKey(keyPem, p12Password || undefined)
      console.log('[wallet/apple] setPrivateKey OK')

      pass = template.createPass({ serialNumber: memberId })
      console.log('[wallet/apple] createPass OK')

      await pass.images.add('icon', icon1x, '1x')
      await pass.images.add('icon', icon2x, '2x')
      await pass.images.add('icon', icon3x, '3x')
      await pass.images.add('logo', LOGO_1X, '1x')
      await pass.images.add('logo', LOGO_2X, '2x')
      await pass.images.add('logo', LOGO_3X, '3x')
      console.log('[wallet/apple] logo images added')
    } catch (e) {
      console.error('[wallet/apple] Template/pass build failed:', e.message, '\n', e.stack)
      return res.status(500).json({ error: 'Failed to build pass template', detail: e.message })
    }

    // ── Step 4: Add fields ────────────────────────────────────────────────────
    console.log('[wallet/apple] step 4: adding fields')
    const displayName = name || email
    // Tier in the header (upper-right corner) — standard membership card pattern
    pass.headerFields.add({ key: 'tier_header', label: 'PLAN', value: tier })
    // Name in primary with no label — avoids the label text overlapping large primary text
    pass.primaryFields.add({ key: 'name', label: '', value: displayName })
    // MEMBER + member ID in secondary row — properly spaced below the name
    pass.secondaryFields.add({ key: 'member_label', label: 'MEMBER ID', value: memberId })
    pass.secondaryFields.add({ key: 'expires', label: 'VALID THROUGH', value: expiryStr })
    pass.auxiliaryFields.add({ key: 'concierge', label: 'CONCIERGE', value: '1-888-454-3019' })
    pass.backFields.add({ key: 'website', label: 'WEBSITE', value: 'subs.app' })
    pass.backFields.add({ key: 'email_support', label: 'EMAIL', value: 'support@subs.app' })
    pass.backFields.add({ key: 'usage', label: 'HOW TO USE', value: 'Show this card to receive member pricing on all home services' })
    pass.backFields.add({ key: 'terms', label: 'TERMS', value: 'Valid for one household. Non-transferable.' })

    // ── Step 5: Generate .pkpass buffer ───────────────────────────────────────
    console.log('[wallet/apple] step 5: generating .pkpass buffer')
    let passBuffer
    try {
      passBuffer = await pass.asBuffer()
      console.log('[wallet/apple] .pkpass generated, size:', passBuffer.length, 'bytes')
    } catch (e) {
      console.error('[wallet/apple] asBuffer failed:', e.message, '\n', e.stack)
      return res.status(500).json({ error: 'Failed to generate .pkpass bundle', detail: e.message })
    }

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

    // ── Step 6: Email .pkpass ─────────────────────────────────────────────────
    let emailSent = false
    if (resendKey && email) {
      console.log('[wallet/apple] step 6: emailing .pkpass to', email)
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <hello@subs.app>',
          to: email,
          subject: `Your SUBS ${tier} membership card`,
          html: emailHtml(name || email, tier, memberId, expiryStr, google_wallet_url),
          attachments: [{
            filename: 'subs-membership.pkpass',
            content: passBuffer.toString('base64'),
          }],
        }),
      })
      emailSent = emailRes.ok
      if (!emailRes.ok) console.error('[wallet/apple] Resend error:', await emailRes.text())
      else console.log('[wallet/apple] email sent OK')
    }

    return res.status(200).json({ success: true, memberId, emailSent })

  } catch (err) {
    console.error('[wallet/apple] unhandled error:', err?.message, '\n', err?.stack)
    return res.status(500).json({ error: 'Internal server error', detail: err?.message })
  }
}

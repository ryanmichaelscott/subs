import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEASONS = [
  {
    name: 'Spring',
    months: 'March — May',
    emoji: '🌱',
    color: '#5DFF8A',
    bg: '#0C1A0F',
    border: '#1A3A20',
    tasks: [
      { title: 'HVAC Filter Change', desc: 'Replace or clean air filters before cooling season. Improves air quality and efficiency.' },
      { title: 'Gutter Cleaning', desc: 'Clear winter debris and check for sags or damage before spring rains.' },
      { title: 'Exterior Inspection', desc: 'Walk the perimeter — check siding, foundation, trim, and caulking for winter damage.' },
      { title: 'Sprinkler Startup', desc: 'Turn on irrigation, test each zone, and check heads for clogs or damage.' },
      { title: 'Window Washing', desc: 'Clean interior and exterior glass, inspect seals, and lubricate tracks.' },
    ],
  },
  {
    name: 'Summer',
    months: 'June — August',
    emoji: '☀️',
    color: '#F5A623',
    bg: '#1A1308',
    border: '#3A2A0A',
    tasks: [
      { title: 'Pest Control Treatment', desc: 'Schedule perimeter treatment before peak season. Prevents infestations before they start.' },
      { title: 'Deck Inspection', desc: 'Check boards for rot, loose fasteners, and structural integrity before heavy use.' },
      { title: 'AC Tune-Up', desc: 'Have HVAC technician service the condenser coils, refrigerant levels, and thermostat calibration.' },
      { title: 'Lawn Fertilization', desc: 'Apply summer-formula fertilizer and spot-treat weeds while growth is active.' },
    ],
  },
  {
    name: 'Fall',
    months: 'September — November',
    emoji: '🍂',
    color: '#FF8C42',
    bg: '#1A0F08',
    border: '#3A1E0A',
    tasks: [
      { title: 'Furnace Inspection', desc: 'Test ignition, clean burners, and replace filters before first heat use of the season.' },
      { title: 'Gutter Cleaning', desc: 'Clear fallen leaves and check downspouts before freeze-thaw cycles begin.' },
      { title: 'Weatherstripping Check', desc: 'Inspect and replace seals around doors and windows to prevent heat loss.' },
      { title: 'Roof Inspection', desc: 'Check for missing or curling shingles and clear any debris before snow loads.' },
    ],
  },
  {
    name: 'Winter',
    months: 'December — February',
    emoji: '❄️',
    color: '#5B8DEF',
    bg: '#08100F',
    border: '#0A1E3A',
    tasks: [
      { title: 'Pipe Insulation Check', desc: 'Inspect exposed pipes in unheated spaces. Add foam wrap to vulnerable lines.' },
      { title: 'Smoke Detector Test', desc: 'Test all units, replace batteries, and check carbon monoxide detectors.' },
      { title: 'Water Heater Flush', desc: 'Flush sediment from the tank to maintain efficiency and extend lifespan.' },
      { title: 'Emergency Kit Review', desc: 'Check flashlights, batteries, first-aid supplies, and food/water reserves.' },
    ],
  },
]

function taskRow(task: { title: string; desc: string }, color: string, isLast: boolean) {
  return `
    <tr>
      <td style="padding:0 0 ${isLast ? '0' : '14px'} 0;vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="28" style="vertical-align:top;padding-top:1px;">
              <div style="width:20px;height:20px;border-radius:5px;border:2px solid ${color}44;display:inline-block;"></div>
            </td>
            <td style="padding-left:10px;vertical-align:top;">
              <div style="font-size:14px;font-weight:700;color:#F0EEE8;margin-bottom:3px;">${task.title}</div>
              <div style="font-size:12px;color:#8A9088;line-height:1.5;">${task.desc}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

function seasonSection(s: typeof SEASONS[0]) {
  const tasks = s.tasks.map((t, i) => taskRow(t, s.color, i === s.tasks.length - 1)).join('')
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0" border="0" width="100%"
            style="background:${s.bg};border:1px solid ${s.border};border-radius:14px;overflow:hidden;">
            <!-- Season header -->
            <tr>
              <td style="padding:20px 24px 16px 24px;border-bottom:1px solid ${s.border};">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="44">
                      <div style="font-size:26px;line-height:1;">${s.emoji}</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <div style="font-size:10px;font-weight:800;color:${s.color};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:2px;">${s.name}</div>
                      <div style="font-size:15px;font-weight:700;color:#F0EEE8;">${s.months}</div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="font-size:11px;color:${s.color};font-weight:600;background:${s.color}18;border-radius:20px;padding:4px 12px;white-space:nowrap;">
                        ${s.tasks.length} tasks
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Tasks -->
            <tr>
              <td style="padding:18px 24px 20px 24px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${tasks}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

function checklistEmail(name: string, tier: string) {
  const firstName = name?.split(' ')[0] || 'there'
  const tierColor = tier === 'Elite' ? '#9B7FE8' : '#5B8DEF'
  const tierLabel = tier === 'Elite' ? 'Elite' : 'Member+'
  const sections = SEASONS.map(s => seasonSection(s)).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your SUBS Home Maintenance Checklist</title>
</head>
<body style="margin:0;padding:0;background:#0C0F0A;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
    <tr>
      <td align="center" style="padding:40px 16px 48px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

          <!-- Logo + header bar -->
          <tr>
            <td style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;color:#5DFF8A;letter-spacing:0.08em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">SUBS</div>
                  </td>
                  <td align="right">
                    <div style="font-size:11px;font-weight:700;color:${tierColor};background:${tierColor}22;border-radius:20px;padding:5px 13px;letter-spacing:0.05em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">${tierLabel} Member</div>
                  </td>
                </tr>
              </table>
              <div style="height:1px;background:#252A23;margin-top:16px;"></div>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding-bottom:36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
              <div style="font-size:13px;font-weight:700;color:#5DFF8A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Your Annual Checklist</div>
              <h1 style="font-size:32px;font-weight:800;color:#F0EEE8;margin:0 0 14px;line-height:1.15;">Never miss a thing,<br>${firstName}.</h1>
              <p style="font-size:14px;color:#8A9088;line-height:1.7;margin:0 0 20px;">
                This is your year-round home maintenance guide — 17 tasks across all four seasons to protect your home and keep systems running before problems start. Save or print this email and check off tasks as you go.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#141814;border:1px solid #252A23;border-radius:10px;padding:12px 18px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:13px;color:#8A9088;padding-right:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                          <span style="color:#5DFF8A;font-weight:700;">17</span> tasks
                        </td>
                        <td style="font-size:13px;color:#8A9088;padding-right:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                          <span style="color:#5DFF8A;font-weight:700;">4</span> seasons
                        </td>
                        <td style="font-size:13px;color:#8A9088;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                          <span style="color:#5DFF8A;font-weight:700;">1</span> year of protection
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Seasonal sections -->
          <tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
              ${sections}
            </td>
          </tr>

          <!-- CTA block -->
          <tr>
            <td style="padding-top:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#0A1A0F;border:1px solid #1A3A20;border-radius:14px;">
                <tr>
                  <td style="padding:28px 28px 24px 28px;">
                    <div style="font-size:11px;font-weight:800;color:#5DFF8A;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Ready to book?</div>
                    <div style="font-size:18px;font-weight:700;color:#F0EEE8;margin-bottom:8px;">Need help with any of these?</div>
                    <p style="font-size:13px;color:#8A9088;line-height:1.6;margin:0 0 20px;">
                      Every task on this checklist is available through your SUBS member dashboard. Submit a service request and we'll match you with a vetted contractor at your member rate.
                    </p>
                    <a href="https://subs.app/dashboard"
                      style="display:inline-block;background:#5DFF8A;color:#0C0F0A;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
                      Submit a service request →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="height:40px;"></td></tr>
          <tr><td><div style="height:1px;background:#252A23;"></div></td></tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size:12px;color:#8A9088;line-height:1.8;">
                      Questions? Call or text <span style="color:#F0EEE8;">1-888-454-3019</span> or visit <a href="https://subs.app" style="color:#5DFF8A;text-decoration:none;">subs.app</a><br>
                      You're receiving this because you're a SUBS ${tierLabel} member.<br>
                      <span style="color:#5A5E58;">© ${new Date().getFullYear()} SUBS. All rights reserved.</span>
                    </div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="font-size:18px;font-weight:800;color:#252A23;letter-spacing:0.06em;">SUBS</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { email, name, tier } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SUBS <hello@subs.app>',
        to: email,
        subject: 'Your SUBS Home Maintenance Checklist — never miss a thing.',
        html: checklistEmail(name || '', tier || 'Member+'),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-checklist-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

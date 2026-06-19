import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function abandonedEmail(name: string): string {
  const firstName = name?.split(' ')[0] || 'there'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your membership is still waiting.</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
    body, table, td { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    body { margin:0; padding:0; background-color:#0C0F0A; }
    table { border-collapse:collapse !important; }
    @media only screen and (max-width:620px) {
      .outer-pad { padding:28px 16px 40px !important; }
      .headline { font-size:32px !important; line-height:1.2 !important; }
      .subhead { font-size:15px !important; }
      .body-copy { font-size:14px !important; }
      .comp-left, .comp-right {
        display:block !important;
        width:100% !important;
        box-sizing:border-box !important;
        margin-bottom:12px !important;
      }
      .comp-spacer { display:none !important; width:0 !important; }
      .cta-link { font-size:15px !important; padding:14px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0C0F0A;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0C0F0A;">
<tr>
  <td class="outer-pad" align="center" style="padding:44px 20px 52px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" style="max-width:580px;width:100%;">

      <!-- LOGO -->
      <tr>
        <td style="padding-bottom:20px;">
          <div style="font-size:18px;font-weight:800;color:#5DFF8A;letter-spacing:0.09em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">SUBS</div>
        </td>
      </tr>
      <tr><td style="padding-bottom:40px;"><div style="height:1px;background:#1C201B;"></div></td></tr>

      <!-- LABEL -->
      <tr>
        <td style="padding-bottom:14px;">
          <div style="font-size:11px;font-weight:700;color:#5DFF8A;letter-spacing:0.14em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">Still available for ${firstName}</div>
        </td>
      </tr>

      <!-- HEADLINE -->
      <tr>
        <td style="padding-bottom:20px;">
          <h1 class="headline" style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:44px;font-weight:400;color:#F0EEE8;margin:0;line-height:1.1;letter-spacing:-0.01em;">
            Your membership<br>is still waiting.
          </h1>
        </td>
      </tr>

      <!-- SUBHEADLINE -->
      <tr>
        <td style="padding-bottom:40px;">
          <p class="subhead" style="font-size:16px;color:#5DFF8A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;margin:0;font-weight:500;line-height:1.55;">
            The average homeowner spends $8,800 a year on home services.<br>SUBS members don't.
          </p>
        </td>
      </tr>

      <tr><td style="padding-bottom:36px;"><div style="height:1px;background:#1C201B;"></div></td></tr>

      <!-- BODY COPY -->
      <tr>
        <td style="padding-bottom:28px;">
          <p class="body-copy" style="font-size:15px;color:#C4C2BC;line-height:1.8;margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
            You were seconds away from wholesale pricing on every home service — plumbing, HVAC, roofing, electrical, lawn care, and more.
          </p>
          <p class="body-copy" style="font-size:15px;color:#C4C2BC;line-height:1.8;margin:0 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
            Every contractor in our network is vetted, background checked, licensed and insured. No more hoping you got a fair price. No more random Google searches.
          </p>

          <!-- SAVINGS BLOCK -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#091409;border-left:3px solid #5DFF8A;border-radius:0 10px 10px 0;margin-bottom:28px;">
            <tr>
              <td style="padding:18px 20px 6px;">
                <div style="font-size:11px;font-weight:700;color:#5DFF8A;letter-spacing:0.11em;text-transform:uppercase;margin-bottom:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                  What SUBS members saved last month
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 6px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-size:14px;color:#F0EEE8;padding:8px 0;border-bottom:1px solid #162016;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                      — HVAC tune-up
                    </td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#5DFF8A;padding:8px 0;border-bottom:1px solid #162016;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;white-space:nowrap;">
                      $215 saved
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#F0EEE8;padding:8px 0;border-bottom:1px solid #162016;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                      — Plumbing repair
                    </td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#5DFF8A;padding:8px 0;border-bottom:1px solid #162016;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;white-space:nowrap;">
                      $190 saved
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#F0EEE8;padding:8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                      — Roof inspection
                    </td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#5DFF8A;padding:8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;white-space:nowrap;">
                      $140 saved
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="height:14px;"></td></tr>
          </table>

          <!-- TAGLINE -->
          <p style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#F0EEE8;margin:0;font-style:italic;line-height:1.4;">
            One membership. Pays for itself on the first call.
          </p>
        </td>
      </tr>

      <tr><td style="padding-bottom:32px;"><div style="height:1px;background:#1C201B;"></div></td></tr>

      <!-- COMPARISON LABEL -->
      <tr>
        <td style="padding-bottom:14px;">
          <div style="font-size:11px;font-weight:600;color:#5A5E58;letter-spacing:0.1em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
            Real example — HVAC tune-up
          </div>
        </td>
      </tr>

      <!-- COMPARISON BLOCK -->
      <tr>
        <td style="padding-bottom:36px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr valign="middle">
              <!-- WITHOUT SUBS -->
              <td class="comp-left" width="46%" style="background:#111411;border:1px solid #222622;border-radius:14px;padding:24px 22px;text-align:center;vertical-align:middle;">
                <div style="font-size:10px;font-weight:700;color:#5A5E58;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                  Without SUBS
                </div>
                <div style="font-family:'DM Serif Display',Georgia,serif;font-size:42px;font-weight:400;color:#4A4E48;line-height:1;text-decoration:line-through;">
                  $380
                </div>
                <div style="font-size:11px;color:#3A3E38;margin-top:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                  retail rate
                </div>
              </td>

              <!-- SPACER -->
              <td class="comp-spacer" width="8%" style="font-size:0;line-height:0;">&nbsp;</td>

              <!-- MEMBER PRICE -->
              <td class="comp-right" width="46%" style="background:#060F07;border:2px solid #5DFF8A;border-radius:14px;padding:24px 22px;text-align:center;vertical-align:middle;">
                <div style="font-size:10px;font-weight:700;color:#5DFF8A;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                  Member price
                </div>
                <div style="font-family:'DM Serif Display',Georgia,serif;font-size:42px;font-weight:400;color:#F0EEE8;line-height:1;">
                  $165
                </div>
                <div style="margin-top:12px;">
                  <span style="font-size:12px;font-weight:700;color:#0C0F0A;background:#5DFF8A;border-radius:20px;padding:4px 12px;display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                    You saved $215
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA BUTTON -->
      <tr>
        <td style="padding-bottom:44px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center" bgcolor="#5DFF8A" style="background:#5DFF8A;border-radius:12px;">
                <a class="cta-link" href="https://subs.app/#pricing"
                  style="display:block;padding:17px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:16px;font-weight:800;color:#0C0F0A;text-decoration:none;letter-spacing:0.01em;text-align:center;">
                  Complete My Membership &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER DIVIDER -->
      <tr><td><div style="height:1px;background:#1C201B;"></div></td></tr>
      <tr><td style="height:28px;"></td></tr>

      <!-- FOOTER -->
      <tr>
        <td>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr valign="bottom">
              <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
                <p style="font-size:12px;color:#8A9088;line-height:1.9;margin:0 0 4px;">
                  Questions? Call or text <span style="color:#C4C2BC;">1-888-454-3019</span> or reply to this email.
                </p>
                <p style="font-size:12px;color:#8A9088;line-height:1.9;margin:0 0 4px;">
                  SUBS &mdash; Wholesale pricing on every home service.
                </p>
                <a href="https://subs.app" style="font-size:12px;color:#5DFF8A;text-decoration:none;">subs.app</a>
              </td>
              <td align="right" valign="bottom">
                <div style="font-size:22px;font-weight:800;color:#1A1E18;letter-spacing:0.08em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">SUBS</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height:32px;"></td></tr>

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Find abandoned checkouts that have been sitting for 2+ hours with no email sent
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: queue, error: qErr } = await supabase
      .from('abandoned_checkouts')
      .select('*')
      .is('email_sent_at', null)
      .lt('expired_at', twoHoursAgo)
      .limit(50)

    if (qErr) {
      console.error('Queue fetch error:', qErr)
      return new Response(JSON.stringify({ error: qErr.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!queue?.length) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0

    for (const row of queue) {
      // Mark processed first to prevent double-send on concurrent runs
      await supabase
        .from('abandoned_checkouts')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', row.id)

      // Skip if they already completed a purchase
      const memberCheck = row.clerk_user_id
        ? supabase.from('members').select('id').eq('clerk_user_id', row.clerk_user_id).eq('status', 'Active').maybeSingle()
        : supabase.from('members').select('id').eq('email', row.email).eq('status', 'Active').maybeSingle()

      const { data: existing } = await memberCheck
      if (existing) {
        console.log(`Skipping ${row.email} — already an active member`)
        continue
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'SUBS <no-reply@subs.app>',
          reply_to: 'support@subs.app',
          to: row.email,
          subject: 'You left something behind.',
          html: abandonedEmail(row.name || ''),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error(`Resend error for ${row.email}:`, err)
      } else {
        sent++
        console.log(`Sent abandoned checkout email to ${row.email}`)
      }
    }

    return new Response(JSON.stringify({ processed: queue.length, sent }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-abandoned-checkout-emails error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

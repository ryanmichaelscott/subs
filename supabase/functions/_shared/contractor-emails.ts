// Contractor onboarding email sequence — shared templates.
// Used by confirm-contractor-subscription (day 0) and contractor-email-sequence (days 1/3/14).

const GREEN = '#5DFF8A'
const INK = '#0C0F0A'
const BONE = '#F0EEE8'
const MUTED = '#8A9088'

function shell(inner: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,system-ui,sans-serif;background:${INK};color:${BONE};margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 28px;">
    <div style="font-size:22px;font-weight:800;color:${GREEN};letter-spacing:0.06em;margin-bottom:32px;">SUBS.</div>
    ${inner}
    <p style="font-size:13px;color:${MUTED};margin-top:40px;line-height:1.6;border-top:1px solid #252A23;padding-top:20px;">
      Questions? We're fast — <a href="mailto:support@subs.app" style="color:${GREEN};text-decoration:none;">support@subs.app</a><br/>
      — The SUBS Team
    </p>
  </div>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${GREEN};color:${INK};font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin:8px 0 24px;">${label}</a>`
}

function h1(text: string): string {
  return `<h1 style="font-size:28px;font-weight:700;color:${BONE};margin:0 0 16px;line-height:1.2;">${text}</h1>`
}

function p(text: string): string {
  return `<p style="font-size:15px;color:${MUTED};line-height:1.7;margin:0 0 20px;">${text}</p>`
}

function list(items: string[]): string {
  return `<table role="presentation" style="margin:0 0 24px;">${items.map(i => `
    <tr><td style="vertical-align:top;padding:0 10px 12px 0;color:${GREEN};font-size:15px;">✓</td>
    <td style="font-size:14.5px;color:${MUTED};line-height:1.6;padding-bottom:12px;">${i}</td></tr>`).join('')}</table>`
}

function codeBox(code: string, link: string): string {
  return `<div style="background:#141814;border:1px dashed ${GREEN};border-radius:12px;padding:20px 24px;text-align:center;margin:0 0 8px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:${MUTED};text-transform:uppercase;margin-bottom:8px;">Your referral code</div>
    <div style="font-family:monospace;font-size:24px;font-weight:700;color:${GREEN};letter-spacing:0.05em;">${code}</div>
    <div style="font-size:13px;color:${MUTED};margin-top:10px;word-break:break-all;">${link}</div>
  </div>`
}

export function day0Email(firstName: string, appUrl: string) {
  const dash = `${appUrl}/contractor/dashboard`
  return {
    subject: "Welcome to SUBS — you're live 🎉",
    html: shell(`
      ${h1(`You're live, ${firstName}.`)}
      ${p(`Your SUBS partner account is active. Homeowner members in your area can now be matched with you — here's how it works:`)}
      ${list([
        `<b style="color:${BONE};">Job requests come to you.</b> When a member in your service area requests your trade, you get notified in your dashboard — no bidding, no lead fees.`,
        `<b style="color:${BONE};">Review your service area and rates.</b> Members see your published member pricing before they request — make sure both are dialed in.`,
        `<b style="color:${BONE};">Respond fast, win the job.</b> Members are pre-qualified and ready to hire.`,
      ])}
      ${button(dash, 'Open your dashboard →')}
      ${p(`Anything look off? Reply to this email or reach us at <a href="mailto:support@subs.app" style="color:${GREEN};text-decoration:none;">support@subs.app</a>.`)}
    `),
  }
}

export function day1Email(firstName: string, appUrl: string) {
  const dash = `${appUrl}/contractor/dashboard`
  return {
    subject: 'Get set up to win your first SUBS job',
    html: shell(`
      ${h1(`One day in, ${firstName} — let's get you job-ready.`)}
      ${p(`Contractors with complete profiles win more requests. A few minutes now pays off:`)}
      ${list([
        `<b style="color:${BONE};">Complete your profile.</b> Add a photo, a short bio, and your license info if it's missing — members hire people they can see.`,
        `<b style="color:${BONE};">How member pricing works.</b> Members pay a yearly fee for access to your member rates. You set those rates in your dashboard — they're what members see when they request your trade.`,
        `<b style="color:${BONE};">What a great response looks like.</b> Respond fast (same-day beats everyone), confirm the scope in plain language, and give a clear next step. Professional and quick wins the job.`,
      ])}
      ${button(dash, 'Finish my setup →')}
    `),
  }
}

export function day3Email(firstName: string, code: string, appUrl: string) {
  const link = `${appUrl}/?ref=${code}`
  return {
    subject: 'You can earn commissions with SUBS 💰',
    html: shell(`
      ${h1(`${firstName}, your referral link is worth real money.`)}
      ${p(`Every homeowner or contractor you refer to SUBS earns you a <b style="color:${BONE};">30% commission</b> — and they get <b style="color:${BONE};">10% off</b>. Everyone wins.`)}
      ${codeBox(code, link)}
      ${p(`<b style="color:${BONE};">What you earn per confirmed signup:</b>`)}
      ${list([
        `<b style="color:${BONE};">Homeowner members:</b> $26–$94 per signup depending on their tier (Member, Member+, or Elite).`,
        `<b style="color:${BONE};">Contractors:</b> $54 per partner who joins with your link.`,
        `Payouts go straight to your bank — automatic once you connect it in your dashboard.`,
      ])}
      ${button(`${appUrl}/contractor/dashboard`, 'Copy my referral link →')}
      ${p(`Text it to past customers, drop it in your invoices, put it on your truck. Every signup is money.`)}
    `),
  }
}

export function day14Email(firstName: string, code: string, appUrl: string, stats: { count: number; unpaid: number }) {
  const link = `${appUrl}/?ref=${code}`
  const hasReferrals = stats.count > 0
  return {
    subject: hasReferrals ? 'Your SUBS referral earnings update' : "Don't leave referral money on the table",
    html: shell(`
      ${h1(hasReferrals ? `Nice work, ${firstName} — here's where you stand.` : `${firstName}, your referral link is still waiting.`)}
      ${hasReferrals
        ? p(`You've referred <b style="color:${BONE};">${stats.count}</b> signup${stats.count === 1 ? '' : 's'} so far.${stats.unpaid > 0 ? ` You have <b style="color:${GREEN};">$${stats.unpaid.toFixed(2)} in commissions</b> ready — connect your bank in the dashboard to claim them.` : ' Keep sharing — every signup is 30% commission.'}`)
        : p(`It's been two weeks and your link hasn't been used yet. Quick reminder of the deal: anyone you refer gets <b style="color:${BONE};">10% off</b>, and you earn <b style="color:${BONE};">30% commission</b> — $26–$94 per homeowner, $54 per contractor.`)}
      ${codeBox(code, link)}
      ${button(`${appUrl}/contractor/dashboard`, stats.unpaid > 0 ? 'Claim my commissions →' : 'Share my link →')}
      ${hasReferrals ? '' : p(`Easiest first move: text it to three past customers who loved your work.`)}
    `),
  }
}

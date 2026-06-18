import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

export default function NpsPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const preScore = parseInt(searchParams.get('score') || '0', 10)

  const [score, setScore] = useState(preScore || 0)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error | invalid

  useEffect(() => {
    if (!token) setStatus('invalid')
  }, [token])

  const submit = async () => {
    if (!score) return
    setStatus('submitting')
    const { data, error } = await supabase.functions.invoke('submit-nps-response', {
      body: { token, score, reason: reason.trim() || undefined },
    })
    if (error || data?.error) {
      setStatus(data?.error?.includes('Invalid') ? 'invalid' : 'error')
    } else {
      setStatus('done')
    }
  }

  const scoreColor = (s) => {
    if (s >= 9) return S.green
    if (s >= 7) return S.blue
    return S.amber
  }

  const label = score >= 9 ? 'Promoter' : score >= 7 ? 'Passive' : score >= 1 ? 'Detractor' : ''

  if (status === 'invalid') return (
    <Page><Msg icon="🔗" title="Link not valid" body="This survey link has expired or is invalid. If you think this is a mistake, contact us at hello@subs.app." /></Page>
  )
  if (status === 'done') return (
    <Page><Msg icon="✓" iconColor={S.green} title="Thanks for your feedback!" body="Your response helps us keep improving SUBS. We really appreciate it." /></Page>
  )
  if (status === 'error') return (
    <Page><Msg icon="⚠️" title="Something went wrong" body="We couldn't save your response. Please try again or reach out at hello@subs.app." /></Page>
  )

  return (
    <Page>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ fontFamily: C.body, fontSize: 20, fontWeight: 800, color: S.green, letterSpacing: '0.06em', marginBottom: 32 }}>SUBS</div>

        <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite, marginBottom: 12, lineHeight: 1.2 }}>
          How likely are you to recommend SUBS?
        </div>
        <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7, marginBottom: 32 }}>
          On a scale of 1–10, how likely are you to recommend SUBS to a friend or neighbor?
        </p>

        {/* Score picker */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(s => (
            <button
              key={s}
              onClick={() => setScore(s)}
              style={{
                width: 48, height: 48, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: score === s ? scoreColor(s) : S.surface,
                color: score === s ? S.black : S.muted,
                fontWeight: 700, fontSize: 16,
                transition: 'all 0.15s',
                outline: score === s ? `2px solid ${scoreColor(s)}` : `1px solid ${S.border}`,
              }}
            >{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S.muted, marginBottom: 28 }}>
          <span>Not likely</span>
          <span>{score > 0 && <span style={{ color: scoreColor(score), fontWeight: 600 }}>{score} — {label}</span>}</span>
          <span>Very likely</span>
        </div>

        {/* Optional reason */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, color: S.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            What's the main reason for your score? <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tell us what's working or what we could do better…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10,
              color: S.offwhite, fontSize: 14, padding: '12px 14px',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
        </div>

        <button
          onClick={submit}
          disabled={!score || status === 'submitting'}
          style={{
            width: '100%', background: score ? S.green : S.surface,
            border: 'none', borderRadius: 10, color: score ? S.black : S.muted,
            fontFamily: C.body, fontSize: 15, fontWeight: 700, padding: '14px 0',
            cursor: score && status !== 'submitting' ? 'pointer' : 'not-allowed',
            opacity: status === 'submitting' ? 0.7 : 1,
            transition: 'all 0.15s',
          }}
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit feedback'}
        </button>
      </div>
    </Page>
  )
}

function Page({ children }) {
  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      {children}
    </div>
  )
}

function Msg({ icon, iconColor, title, body }) {
  return (
    <div style={{ maxWidth: 420, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16, color: iconColor }}>{icon}</div>
      <div style={{ fontFamily: C.display, fontSize: 26, color: S.offwhite, marginBottom: 12 }}>{title}</div>
      <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.7 }}>{body}</p>
    </div>
  )
}

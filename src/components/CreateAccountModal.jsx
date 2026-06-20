import { useState } from 'react'
import { S, C } from '../theme'

const ACCOUNT_TYPES = [
  { id: 'member',           label: 'Homeowner',        sub: 'Member account' },
  { id: 'contractor',       label: 'Contractor',        sub: 'Service provider' },
  { id: 'property_manager', label: 'Property Manager',  sub: 'Portfolio/Professional' },
  { id: 'enterprise_custom',label: 'Enterprise',        sub: 'Custom deal' },
]

const MEMBER_TIERS = [
  { id: 'member', label: 'Member',  price: '$99/yr' },
  { id: 'plus',   label: 'Member+', price: '$179/yr' },
  { id: 'elite',  label: 'Elite',   price: '$349/yr' },
]

const PM_PLANS = [
  { id: 'portfolio',       label: 'Portfolio',     price: '$749/yr' },
  { id: 'professional',    label: 'Professional',  price: '$1,899/yr' },
  { id: 'enterprise_custom', label: 'Enterprise',  price: 'Custom' },
]

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{children}</div>
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, padding: '9px 12px', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
      onFocus={e => { e.target.style.borderColor = S.green }}
      onBlur={e => { e.target.style.borderColor = S.border }}
    />
  )
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SegmentPicker({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            flex: 1, minWidth: 80, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${value === opt.id ? S.green : S.border}`,
            background: value === opt.id ? S.green + '18' : 'transparent',
            color: value === opt.id ? S.green : S.muted,
            fontSize: 13, fontWeight: 600, textAlign: 'center',
            transition: 'all 0.15s',
          }}
        >
          <div>{opt.label}</div>
          {opt.price && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{opt.price}</div>}
          {opt.sub && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>}
        </button>
      ))}
    </div>
  )
}

export default function CreateAccountModal({ onClose, onCreated }) {
  const [accountType, setAccountType] = useState('member')
  const [fields, setFields] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const set = (key, val) => setFields(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const body = { type: accountType, ...fields }

      // normalize property_manager with enterprise_custom plan
      if (accountType === 'property_manager' && fields.plan === 'enterprise_custom') {
        body.type = 'property_manager'
      }

      const res = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Unknown error')
      } else {
        setResult(data)
        if (onCreated) onCreated(accountType)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const renderForm = () => {
    if (accountType === 'member') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name"><Input value={fields.full_name || ''} onChange={v => set('full_name', v)} placeholder="Jane Smith" /></Field>
        <Field label="Email"><Input type="email" value={fields.email || ''} onChange={v => set('email', v)} placeholder="jane@email.com" /></Field>
        <Field label="Phone (optional)"><Input value={fields.phone || ''} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" /></Field>
        <Field label="Tier">
          <SegmentPicker options={MEMBER_TIERS} value={fields.tier || 'member'} onChange={v => set('tier', v)} />
        </Field>
        <div style={{ fontSize: 12, color: S.muted, background: S.surface, padding: '10px 12px', borderRadius: 8, lineHeight: 1.6 }}>
          Creates Clerk account, Supabase member record, Stripe customer, and sends payment link to their email.
        </div>
      </div>
    )

    if (accountType === 'contractor') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name"><Input value={fields.full_name || ''} onChange={v => set('full_name', v)} placeholder="Mike Johnson" /></Field>
        <Field label="Business Name (optional)"><Input value={fields.business_name || ''} onChange={v => set('business_name', v)} placeholder="Johnson Plumbing LLC" /></Field>
        <Field label="Email"><Input type="email" value={fields.email || ''} onChange={v => set('email', v)} placeholder="mike@johnsonplumbing.com" /></Field>
        <Field label="Phone"><Input value={fields.phone || ''} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Trade / Specialty"><Input value={fields.trade || ''} onChange={v => set('trade', v)} placeholder="Plumbing" /></Field>
          <Field label="Service City"><Input value={fields.service_city || ''} onChange={v => set('service_city', v)} placeholder="Nashville" /></Field>
        </div>
        <Field label="Service State"><Input value={fields.service_state || ''} onChange={v => set('service_state', v)} placeholder="TN" /></Field>
        <div style={{ fontSize: 12, color: S.muted, background: S.surface, padding: '10px 12px', borderRadius: 8, lineHeight: 1.6 }}>
          Creates Clerk account with contractor role, Supabase record (status: pending), and sends onboarding email to complete their profile.
        </div>
      </div>
    )

    if (accountType === 'property_manager') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name"><Input value={fields.full_name || ''} onChange={v => set('full_name', v)} placeholder="Sarah Williams" /></Field>
        <Field label="Company Name"><Input value={fields.company_name || ''} onChange={v => set('company_name', v)} placeholder="Williams Property Group" /></Field>
        <Field label="Email"><Input type="email" value={fields.email || ''} onChange={v => set('email', v)} placeholder="sarah@williamspm.com" /></Field>
        <Field label="Phone"><Input value={fields.phone || ''} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" /></Field>
        <Field label="Number of Units"><Input type="number" value={fields.unit_count || ''} onChange={v => set('unit_count', v)} placeholder="50" /></Field>
        <Field label="Plan">
          <SegmentPicker options={PM_PLANS} value={fields.plan || 'portfolio'} onChange={v => set('plan', v)} />
        </Field>
        <div style={{ fontSize: 12, color: S.muted, background: S.surface, padding: '10px 12px', borderRadius: 8, lineHeight: 1.6 }}>
          {fields.plan === 'enterprise_custom'
            ? 'Creates account with status pending. ryan@skscott.com will be notified to finalize pricing.'
            : 'Creates Clerk account with enterprise role, Stripe customer, and sends payment link to their email.'}
        </div>
      </div>
    )

    if (accountType === 'enterprise_custom') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name"><Input value={fields.full_name || ''} onChange={v => set('full_name', v)} placeholder="David Chen" /></Field>
        <Field label="Company Name"><Input value={fields.company_name || ''} onChange={v => set('company_name', v)} placeholder="Chen Capital Group" /></Field>
        <Field label="Email"><Input type="email" value={fields.email || ''} onChange={v => set('email', v)} placeholder="david@chencapital.com" /></Field>
        <Field label="Phone"><Input value={fields.phone || ''} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" /></Field>
        <Field label="Number of Units"><Input type="number" value={fields.unit_count || ''} onChange={v => set('unit_count', v)} placeholder="200" /></Field>
        <Field label="Negotiated Annual Price ($)">
          <Input type="number" value={fields.negotiated_price || ''} onChange={v => set('negotiated_price', v)} placeholder="3500" />
        </Field>
        <div style={{ fontSize: 12, color: S.muted, background: S.surface, padding: '10px 12px', borderRadius: 8, lineHeight: 1.6 }}>
          Creates Clerk account, enterprise_member record, Stripe customer, creates a custom Stripe price at the negotiated amount, and starts the subscription immediately. Sends welcome email + notifies ryan@skscott.com.
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget && !result) onClose() }}
    >
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', padding: 32 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: C.display, fontSize: 22, color: S.offwhite }}>Create Account</div>
            <div style={{ fontSize: 13, color: S.muted, marginTop: 3 }}>Manually onboard a new account</div>
          </div>
          {!result && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: S.muted, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Success state */}
        {result ? (
          <div>
            <div style={{ background: S.green + '18', border: `1px solid ${S.green}44`, borderRadius: 10, padding: '20px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: S.green, marginBottom: 6 }}>Account created</div>
              <div style={{ fontSize: 13, color: S.offwhite, lineHeight: 1.6 }}>{result.message}</div>
              {result.checkout_url && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: S.muted, marginBottom: 4 }}>PAYMENT LINK (also sent by email)</div>
                  <a href={result.checkout_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: S.blue, wordBreak: 'break-all', textDecoration: 'none', background: S.surface, padding: '8px 10px', borderRadius: 6, display: 'block', border: `1px solid ${S.border}` }}>
                    {result.checkout_url}
                  </a>
                </div>
              )}
              {result.clerk_user_id && (
                <div style={{ marginTop: 10, fontSize: 12, color: S.muted }}>Clerk ID: <span style={{ color: S.offwhite, fontFamily: 'monospace' }}>{result.clerk_user_id}</span></div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setResult(null); setFields({}); setAccountType('member') }}
                style={{ flex: 1, background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, fontWeight: 600, padding: '10px', borderRadius: 8, cursor: 'pointer' }}>
                Create Another
              </button>
              <button onClick={onClose}
                style={{ flex: 1, background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '10px', borderRadius: 8, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Account type tabs */}
            <div style={{ marginBottom: 24 }}>
              <Label>Account Type</Label>
              <SegmentPicker options={ACCOUNT_TYPES} value={accountType} onChange={v => { setAccountType(v); setFields({}) }} />
            </div>

            {/* Form */}
            {renderForm()}

            {/* Error */}
            {error && (
              <div style={{ marginTop: 16, background: S.danger + '18', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginTop: 20, width: '100%', background: loading ? S.border : S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '12px', borderRadius: 9, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

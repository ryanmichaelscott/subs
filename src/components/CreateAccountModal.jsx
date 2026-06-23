import { useState } from 'react'
import { S, C } from '../theme'

const TRADES_LIST = [
  'Additions & ADUs', 'Bathroom Remodel', 'Carpet Cleaning', 'Concrete Work', 'Countertops',
  'Decks & Patios', 'Driveway Paving', 'Electrical', 'Excavation', 'Exterior Painting',
  'Fencing', 'Finish Carpentry', 'Fireplace & Chimney', 'Flooring', 'Framing',
  'Garage Doors', 'Gutters', 'Handyman', 'House Cleaning', 'HVAC',
  'Insulation', 'Interior Painting', 'Kitchen Remodel', 'Landscaping', 'Lawn Care',
  'Fire, Mold & Flood Restoration', 'Mold Detection', 'Pest Control', 'Plumbing', 'Pool Service', 'Roofing',
  'Siding & Stucco', 'Smart Home / AV', 'Solar', 'Tree Service', 'Water Filtration',
  'Waterproofing', 'Window Cleaning', 'Window Install', 'Window Treatments / Blinds', 'Windows & Doors',
]

const RADIUS_OPTIONS = ['10 miles', '25 miles', '50 miles', '75 miles', '100 miles', '150 miles', 'Statewide']

const ACCOUNT_TYPES = [
  { id: 'member',            label: 'Homeowner',       sub: 'Member account' },
  { id: 'contractor',        label: 'Contractor',       sub: 'Service provider' },
  { id: 'property_manager',  label: 'Prop. Manager',    sub: 'Portfolio/Pro' },
  { id: 'enterprise_custom', label: 'Enterprise',       sub: 'Custom deal' },
]

const MEMBER_TIERS = [
  { id: 'member', label: 'Member',  price: '$99/yr' },
  { id: 'plus',   label: 'Member+', price: '$179/yr' },
  { id: 'elite',  label: 'Elite',   price: '$349/yr' },
]

const PM_PLANS = [
  { id: 'portfolio',         label: 'Portfolio',    price: '$749/yr' },
  { id: 'professional',      label: 'Professional', price: '$1,899/yr' },
  { id: 'enterprise_custom', label: 'Enterprise',   price: 'Custom' },
]

const HAS_PAYMENT = ['member', 'contractor', 'property_manager']

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

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: S.surface, border: `1px solid ${S.border}`, color: value ? S.offwhite : S.muted, fontSize: 13, padding: '9px 12px', borderRadius: 8, outline: 'none', boxSizing: 'border-box', appearance: 'none' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
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

function SegmentPicker({ options, value, onChange, columns }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : `repeat(${options.length}, 1fr)`, gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${value === opt.id ? S.green : S.border}`,
            background: value === opt.id ? S.green + '18' : 'transparent',
            color: value === opt.id ? S.green : S.muted,
            fontSize: 12, fontWeight: 600, textAlign: 'center',
            transition: 'all 0.15s',
          }}
        >
          <div>{opt.label}</div>
          {opt.price && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{opt.price}</div>}
          {opt.sub && <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>{opt.sub}</div>}
        </button>
      ))}
    </div>
  )
}

function PaymentToggle({ value, onChange }) {
  return (
    <div>
      <Label>Collect payment</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { id: 'open_now',   icon: '💳', title: 'Open now',        sub: 'Take card over the phone' },
          { id: 'send_email', icon: '✉️', title: 'Send link',       sub: 'Customer pays via email' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${value === opt.id ? S.green : S.border}`,
              background: value === opt.id ? S.green + '15' : 'transparent',
              color: value === opt.id ? S.green : S.muted,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>{opt.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: value === opt.id ? S.green : S.offwhite }}>{opt.title}</div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{opt.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CreateAccountModal({ onClose, onCreated }) {
  const [accountType, setAccountType] = useState('member')
  const [fields, setFields] = useState({})
  const [paymentMode, setPaymentMode] = useState('open_now')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  const set = (key, val) => setFields(f => ({ ...f, [key]: val }))
  const showPaymentToggle = HAS_PAYMENT.includes(accountType) &&
    !(accountType === 'property_manager' && fields.plan === 'enterprise_custom')

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const body = {
        type: accountType,
        send_email: showPaymentToggle && paymentMode === 'send_email',
        ...fields,
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
        // Auto-open payment page if that mode was selected
        if (showPaymentToggle && paymentMode === 'open_now' && data.checkout_url) {
          window.open(data.checkout_url, '_blank')
        }
        if (paymentMode === 'send_email') setEmailSent(true)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!result?.checkout_url) return
    setEmailSending(true)
    try {
      await fetch('/api/admin/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: result.email,
          name: result.full_name,
          checkout_url: result.checkout_url,
          tier_label: result.tier_label,
        }),
      })
      setEmailSent(true)
    } catch {
      // fail silently — link is always visible to copy
    } finally {
      setEmailSending(false)
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
        <PaymentToggle value={paymentMode} onChange={setPaymentMode} />
      </div>
    )

    if (accountType === 'contractor') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name"><Input value={fields.full_name || ''} onChange={v => set('full_name', v)} placeholder="Mike Johnson" /></Field>
        <Field label="Business Name (optional)"><Input value={fields.business_name || ''} onChange={v => set('business_name', v)} placeholder="Johnson Plumbing LLC" /></Field>
        <Field label="Email"><Input type="email" value={fields.email || ''} onChange={v => set('email', v)} placeholder="mike@johnsonplumbing.com" /></Field>
        <Field label="Phone"><Input value={fields.phone || ''} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" /></Field>
        <Field label="Trade">
          <Select value={fields.trade || ''} onChange={v => set('trade', v)} options={TRADES_LIST} placeholder="Select trade…" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="City"><Input value={fields.service_city || ''} onChange={v => set('service_city', v)} placeholder="Nashville" /></Field>
          <Field label="State"><Input value={fields.service_state || ''} onChange={v => set('service_state', v)} placeholder="TN" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Zip Code"><Input value={fields.zip_code || ''} onChange={v => set('zip_code', v)} placeholder="37201" /></Field>
          <Field label="Service Radius">
            <Select value={fields.service_radius || ''} onChange={v => set('service_radius', v)} options={RADIUS_OPTIONS} placeholder="Select radius…" />
          </Field>
        </div>
        {showPaymentToggle && <PaymentToggle value={paymentMode} onChange={setPaymentMode} />}
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
        {showPaymentToggle && <PaymentToggle value={paymentMode} onChange={setPaymentMode} />}
        {fields.plan === 'enterprise_custom' && (
          <div style={{ fontSize: 12, color: S.muted, background: S.surface, padding: '10px 12px', borderRadius: 8, lineHeight: 1.6 }}>
            Creates account (pending). support@subs.app will be notified to finalize pricing.
          </div>
        )}
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
          Creates Clerk account, Supabase record, custom Stripe price at negotiated amount, starts subscription immediately.
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .cam-inner { padding: 32px; }
        .cam-types { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 540px) {
          .cam-inner { padding: 20px 16px; }
          .cam-types { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 12px', overflowY: 'auto' }}
        onClick={e => { if (e.target === e.currentTarget && !result) onClose() }}
      >
        <div className="cam-inner" style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, width: '100%', maxWidth: 520, marginTop: 24, marginBottom: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: C.display, fontSize: 20, color: S.offwhite }}>Create Account</div>
              <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>Manually onboard a new account</div>
            </div>
            {!result && (
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: S.muted, fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1, marginTop: -2 }}>×</button>
            )}
          </div>

          {/* Success state */}
          {result ? (
            <div>
              <div style={{ background: S.green + '18', border: `1px solid ${S.green}44`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.green, marginBottom: 4 }}>Account created</div>
                <div style={{ fontSize: 13, color: S.offwhite, lineHeight: 1.6 }}>{result.message}</div>
              </div>

              {result.checkout_url && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Payment link</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <a
                      href={result.checkout_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '11px 12px', borderRadius: 8, cursor: 'pointer', textDecoration: 'none' }}
                    >
                      💳 Open payment page
                    </a>
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSent || emailSending}
                      style={{ background: emailSent ? S.green + '18' : S.surface, border: `1px solid ${emailSent ? S.green + '44' : S.border}`, color: emailSent ? S.green : S.offwhite, fontSize: 13, fontWeight: 600, padding: '11px 12px', borderRadius: 8, cursor: emailSent ? 'default' : 'pointer' }}
                    >
                      {emailSent ? '✓ Link sent' : emailSending ? 'Sending…' : `✉️ Email to ${result.email?.split('@')[0]}`}
                    </button>
                  </div>
                  <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: S.muted, marginBottom: 3 }}>Or copy link manually</div>
                    <div style={{ fontSize: 11, color: S.blue, wordBreak: 'break-all', lineHeight: 1.4 }}>{result.checkout_url}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => { setResult(null); setFields({}); setEmailSent(false); setPaymentMode('open_now') }}
                  style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, fontWeight: 600, padding: '10px', borderRadius: 8, cursor: 'pointer' }}>
                  Create Another
                </button>
                <button onClick={onClose}
                  style={{ background: S.green, border: 'none', color: S.black, fontSize: 13, fontWeight: 700, padding: '10px', borderRadius: 8, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Account type picker */}
              <div style={{ marginBottom: 20 }}>
                <Label>Account Type</Label>
                <div className="cam-types" style={{ display: 'grid', gap: 6 }}>
                  {ACCOUNT_TYPES.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setAccountType(opt.id); setFields({}); setPaymentMode('open_now') }}
                      style={{
                        padding: '9px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        border: `1px solid ${accountType === opt.id ? S.green : S.border}`,
                        background: accountType === opt.id ? S.green + '18' : 'transparent',
                        color: accountType === opt.id ? S.green : S.muted,
                        fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                      }}
                    >
                      <div>{opt.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {renderForm()}

              {error && (
                <div style={{ marginTop: 14, background: S.danger + '18', border: `1px solid ${S.danger}44`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: S.danger }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ marginTop: 18, width: '100%', background: loading ? S.border : S.green, border: 'none', color: S.black, fontSize: 14, fontWeight: 700, padding: '12px', borderRadius: 9, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
              >
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

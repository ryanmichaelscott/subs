import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { S, C } from '../theme'
import { supabase } from '../lib/supabase'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

const PROPERTY_TYPES = [
  'Single Family',
  'Multi-Family',
  'Condo',
  'Commercial',
  'Other',
]

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: S.surface,
  border: `1px solid ${S.border}`,
  color: S.offwhite,
  padding: '12px',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: C.body,
}

const labelStyle = {
  display: 'block',
  color: S.muted,
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  fontFamily: C.body,
}

function InputField({ label, id, style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '18px', ...style }}>
      {label && <label htmlFor={id} style={labelStyle}>{label}</label>}
      <input
        id={id}
        style={{
          ...inputStyle,
          border: focused ? `1px solid ${S.green}` : `1px solid ${S.border}`,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  )
}

function SelectField({ label, id, children, style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '18px', ...style }}>
      {label && <label htmlFor={id} style={labelStyle}>{label}</label>}
      <select
        id={id}
        style={{
          ...inputStyle,
          border: focused ? `1px solid ${S.green}` : `1px solid ${S.border}`,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238A9088' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
          cursor: 'pointer',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ─── Progress Indicator ──────────────────────────────────────────────────────

const STEPS = ['Company Info', 'Properties', 'Confirm']

function ProgressIndicator({ currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: '40px' }}>
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1
        const isComplete = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        const isFuture = stepNum > currentStep

        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Step circle + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: C.body,
                  fontWeight: 700,
                  fontSize: '14px',
                  background: isComplete ? S.muted : isCurrent ? S.green : 'transparent',
                  border: isFuture ? `2px solid ${S.border}` : 'none',
                  color: isComplete ? S.offwhite : isCurrent ? S.black : S.muted,
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke={S.offwhite} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  fontFamily: C.body,
                  color: isCurrent ? S.offwhite : S.muted,
                  fontWeight: isCurrent ? 600 : 400,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  height: '2px',
                  width: '60px',
                  background: stepNum < currentStep ? S.muted : S.border,
                  marginTop: '17px',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Company & Contact Info ─────────────────────────────────────────

function Step1({ data, onChange, onContinue }) {
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!data.company_name.trim()) e.company_name = 'Required'
    if (!data.contact_name.trim()) e.contact_name = 'Required'
    if (!data.email.trim()) e.email = 'Required'
    if (!data.phone.trim()) e.phone = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleContinue() {
    if (validate()) onContinue()
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: C.display,
          fontSize: '28px',
          color: S.offwhite,
          margin: '0 0 8px 0',
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        Tell us about your company
      </h1>
      <p style={{ color: S.muted, fontSize: '14px', fontFamily: C.body, margin: '0 0 32px 0' }}>
        We'll use this to set up your enterprise account.
      </p>

      <div>
        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="company_name" style={labelStyle}>Company Name</label>
          <input
            id="company_name"
            type="text"
            placeholder="Acme Property Management"
            value={data.company_name}
            onChange={e => onChange('company_name', e.target.value)}
            style={{ ...inputStyle, border: errors.company_name ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
            onFocus={e => { if (!errors.company_name) e.target.style.border = `1px solid ${S.green}` }}
            onBlur={e => { e.target.style.border = errors.company_name ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
          />
          {errors.company_name && (
            <span style={{ color: S.danger, fontSize: '12px', fontFamily: C.body, marginTop: '4px', display: 'block' }}>
              {errors.company_name}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="contact_name" style={labelStyle}>Contact Name</label>
          <input
            id="contact_name"
            type="text"
            placeholder="Jane Smith"
            value={data.contact_name}
            onChange={e => onChange('contact_name', e.target.value)}
            style={{ ...inputStyle, border: errors.contact_name ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
            onFocus={e => { if (!errors.contact_name) e.target.style.border = `1px solid ${S.green}` }}
            onBlur={e => { e.target.style.border = errors.contact_name ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
          />
          {errors.contact_name && (
            <span style={{ color: S.danger, fontSize: '12px', fontFamily: C.body, marginTop: '4px', display: 'block' }}>
              {errors.contact_name}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            type="email"
            placeholder="jane@acme.com"
            value={data.email}
            onChange={e => onChange('email', e.target.value)}
            style={{ ...inputStyle, border: errors.email ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
            onFocus={e => { if (!errors.email) e.target.style.border = `1px solid ${S.green}` }}
            onBlur={e => { e.target.style.border = errors.email ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
          />
          {errors.email && (
            <span style={{ color: S.danger, fontSize: '12px', fontFamily: C.body, marginTop: '4px', display: 'block' }}>
              {errors.email}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label htmlFor="phone" style={labelStyle}>Phone</label>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 000-0000"
            value={data.phone}
            onChange={e => onChange('phone', e.target.value)}
            style={{ ...inputStyle, border: errors.phone ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
            onFocus={e => { if (!errors.phone) e.target.style.border = `1px solid ${S.green}` }}
            onBlur={e => { e.target.style.border = errors.phone ? `1px solid ${S.danger}` : `1px solid ${S.border}` }}
          />
          {errors.phone && (
            <span style={{ color: S.danger, fontSize: '12px', fontFamily: C.body, marginTop: '4px', display: 'block' }}>
              {errors.phone}
            </span>
          )}
        </div>

        <button
          onClick={handleContinue}
          style={{
            width: '100%',
            padding: '14px',
            background: S.green,
            color: S.black,
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: C.body,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Add Properties ──────────────────────────────────────────────────

const emptyPropertyForm = {
  address: '',
  city: '',
  state: '',
  zip: '',
  property_type: 'Single Family',
  unit_count: '',
}

function PropertyCard({ property, onRemove, index }) {
  return (
    <div
      style={{
        background: S.surface,
        border: `1px solid ${S.border}`,
        borderRadius: '8px',
        padding: '14px 16px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: S.offwhite, fontSize: '14px', fontWeight: 600, fontFamily: C.body, marginBottom: '3px' }}>
          {property.address}
        </div>
        <div style={{ color: S.muted, fontSize: '13px', fontFamily: C.body }}>
          {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
          {property.property_type && (
            <span style={{ marginLeft: '8px', color: S.muted }}>· {property.property_type}</span>
          )}
          {property.unit_count && (
            <span style={{ marginLeft: '8px', color: S.muted }}>
              · {property.unit_count} {parseInt(property.unit_count) === 1 ? 'unit' : 'units'}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(index)}
        title="Remove property"
        style={{
          background: 'none',
          border: 'none',
          color: S.muted,
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '18px',
          lineHeight: 1,
          flexShrink: 0,
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.target.style.color = S.danger}
        onMouseLeave={e => e.target.style.color = S.muted}
        aria-label="Remove property"
      >
        ×
      </button>
    </div>
  )
}

function Step2({ properties, onPropertiesChange, onContinue, onSkip }) {
  const [form, setForm] = useState(emptyPropertyForm)
  const [showTooltip, setShowTooltip] = useState(false)
  const [formFocused, setFormFocused] = useState({})

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleAdd() {
    if (!form.address.trim()) return
    onPropertiesChange([...properties, { ...form }])
    setForm(emptyPropertyForm)
  }

  function handleRemove(index) {
    onPropertiesChange(properties.filter((_, i) => i !== index))
  }

  function handleFocus(field) {
    setFormFocused(prev => ({ ...prev, [field]: true }))
  }
  function handleBlur(field) {
    setFormFocused(prev => ({ ...prev, [field]: false }))
  }

  function fieldBorder(field) {
    return formFocused[field] ? `1px solid ${S.green}` : `1px solid ${S.border}`
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: C.display,
          fontSize: '28px',
          color: S.offwhite,
          margin: '0 0 6px 0',
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        Add your properties
      </h1>
      <p style={{ color: S.muted, fontSize: '14px', fontFamily: C.body, margin: '0 0 28px 0' }}>
        Add the properties in your portfolio. You can always add more later.
      </p>

      {/* Added properties list */}
      {properties.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {properties.map((p, i) => (
            <PropertyCard key={i} property={p} onRemove={handleRemove} index={i} />
          ))}
        </div>
      )}

      {/* Add property form */}
      <div
        style={{
          background: S.surface,
          border: `1px solid ${S.border}`,
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ color: S.offwhite, fontSize: '13px', fontWeight: 600, fontFamily: C.body, marginBottom: '16px', letterSpacing: '0.02em' }}>
          Add a Property
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            placeholder="123 Main St"
            value={form.address}
            onChange={e => updateForm('address', e.target.value)}
            style={{ ...inputStyle, border: fieldBorder('address') }}
            onFocus={() => handleFocus('address')}
            onBlur={() => handleBlur('address')}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              placeholder="Los Angeles"
              value={form.city}
              onChange={e => updateForm('city', e.target.value)}
              style={{ ...inputStyle, border: fieldBorder('city') }}
              onFocus={() => handleFocus('city')}
              onBlur={() => handleBlur('city')}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>State</label>
            <select
              value={form.state}
              onChange={e => updateForm('state', e.target.value)}
              style={{
                ...inputStyle,
                border: fieldBorder('state'),
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238A9088' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '32px',
                cursor: 'pointer',
              }}
              onFocus={() => handleFocus('state')}
              onBlur={() => handleBlur('state')}
            >
              <option value="">ST</option>
              {US_STATES.map(([abbr]) => (
                <option key={abbr} value={abbr}>{abbr}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Zip</label>
            <input
              type="text"
              placeholder="90001"
              value={form.zip}
              onChange={e => updateForm('zip', e.target.value)}
              style={{ ...inputStyle, border: fieldBorder('zip') }}
              onFocus={() => handleFocus('zip')}
              onBlur={() => handleBlur('zip')}
              maxLength={10}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Property Type</label>
            <select
              value={form.property_type}
              onChange={e => updateForm('property_type', e.target.value)}
              style={{
                ...inputStyle,
                border: fieldBorder('property_type'),
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238A9088' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '32px',
                cursor: 'pointer',
              }}
              onFocus={() => handleFocus('property_type')}
              onBlur={() => handleBlur('property_type')}
            >
              {PROPERTY_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Unit Count</label>
          <input
            type="number"
            placeholder="1"
            value={form.unit_count}
            onChange={e => updateForm('unit_count', e.target.value)}
            style={{ ...inputStyle, border: fieldBorder('unit_count'), width: '120px' }}
            onFocus={() => handleFocus('unit_count')}
            onBlur={() => handleBlur('unit_count')}
            min={1}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!form.address.trim()}
          style={{
            padding: '10px 20px',
            background: form.address.trim() ? S.green : S.border,
            color: form.address.trim() ? S.black : S.muted,
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: C.body,
            cursor: form.address.trim() ? 'pointer' : 'not-allowed',
            letterSpacing: '0.01em',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          + Add Property
        </button>
      </div>

      {/* Continue / Skip */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={properties.length > 0 ? onContinue : undefined}
          onMouseEnter={() => { if (properties.length === 0) setShowTooltip(true) }}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            width: '100%',
            padding: '14px',
            background: properties.length > 0 ? S.green : S.border,
            color: properties.length > 0 ? S.black : S.muted,
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: C.body,
            cursor: properties.length > 0 ? 'pointer' : 'not-allowed',
            letterSpacing: '0.01em',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Continue
        </button>

        {showTooltip && properties.length === 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: S.surface,
              border: `1px solid ${S.border}`,
              color: S.offwhite,
              fontSize: '12px',
              fontFamily: C.body,
              padding: '6px 12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            Add at least one property
            <div
              style={{
                position: 'absolute',
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                background: S.surface,
                borderRight: `1px solid ${S.border}`,
                borderBottom: `1px solid ${S.border}`,
              }}
            />
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: S.green,
            fontSize: '13px',
            fontFamily: C.body,
            cursor: 'pointer',
            padding: '4px 8px',
            textDecoration: 'none',
          }}
        >
          Skip for now — I'll add properties later
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Review & Confirm ────────────────────────────────────────────────

function Step3({ contactData, properties, onConfirm, loading, error }) {
  const totalUnits = properties.reduce((sum, p) => sum + (parseInt(p.unit_count) || 0), 0)

  return (
    <div>
      <h1
        style={{
          fontFamily: C.display,
          fontSize: '28px',
          color: S.offwhite,
          margin: '0 0 8px 0',
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        You're all set
      </h1>
      <p style={{ color: S.muted, fontSize: '14px', fontFamily: C.body, margin: '0 0 28px 0' }}>
        Review your details before we create your account.
      </p>

      {/* Summary card */}
      <div
        style={{
          background: S.surface,
          border: `1px solid ${S.border}`,
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '28px',
        }}
      >
        {/* Company section */}
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ color: S.muted, fontSize: '11px', fontWeight: 700, fontFamily: C.body, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Company
          </div>
          <div style={{ color: S.offwhite, fontSize: '17px', fontWeight: 600, fontFamily: C.body, marginBottom: '4px' }}>
            {contactData.company_name}
          </div>
          <div style={{ color: S.muted, fontSize: '14px', fontFamily: C.body, marginBottom: '2px' }}>
            {contactData.contact_name}
          </div>
          <div style={{ color: S.muted, fontSize: '14px', fontFamily: C.body }}>
            {contactData.email}
          </div>
        </div>

        {/* Properties section */}
        <div>
          <div style={{ color: S.muted, fontSize: '11px', fontWeight: 700, fontFamily: C.body, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Properties
          </div>
          {properties.length === 0 ? (
            <div style={{ color: S.muted, fontSize: '14px', fontFamily: C.body, fontStyle: 'italic' }}>
              No properties added — you can add them from your dashboard.
            </div>
          ) : (
            <>
              <div style={{ color: S.offwhite, fontSize: '14px', fontFamily: C.body, marginBottom: '10px' }}>
                <span style={{ fontWeight: 600 }}>{properties.length}</span>{' '}
                {properties.length === 1 ? 'property' : 'properties'}
                {totalUnits > 0 && (
                  <span style={{ color: S.muted }}>
                    {' '}· {totalUnits} total {totalUnits === 1 ? 'unit' : 'units'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {properties.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: S.green,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: S.offwhite, fontSize: '13px', fontFamily: C.body }}>
                      {p.address}
                      {p.city && `, ${p.city}`}
                      {p.state && `, ${p.state}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: `${S.danger}18`,
            border: `1px solid ${S.danger}40`,
            borderRadius: '8px',
            padding: '12px 16px',
            color: S.danger,
            fontSize: '13px',
            fontFamily: C.body,
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          background: loading ? S.border : S.green,
          color: loading ? S.muted : S.black,
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: C.body,
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.01em',
          transition: 'background 0.15s, color 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading ? (
          <>
            <Spinner />
            Setting up your account…
          </>
        ) : (
          'Confirm & go to dashboard'
        )}
      </button>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6" stroke={S.muted} strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EnterpriseOnboarding() {
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [contactData, setContactData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
  })

  const [properties, setProperties] = useState([])

  // Pre-fill from Clerk once user is loaded
  useEffect(() => {
    if (!isLoaded || !user) return
    setContactData(prev => ({
      ...prev,
      contact_name: prev.contact_name || user.fullName || '',
      email: prev.email || user.primaryEmailAddress?.emailAddress || '',
    }))
  }, [isLoaded, user])

  function handleContactChange(key, value) {
    setContactData(prev => ({ ...prev, [key]: value }))
  }

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const plan = new URLSearchParams(window.location.search).get('plan') || 'portfolio'
      const totalUnits = properties.reduce((sum, p) => sum + (parseInt(p.unit_count) || 0), 0)

      // 1. Upsert enterprise_member
      const { data: memberRows, error: memberError } = await supabase
        .from('enterprise_members')
        .upsert(
          {
            clerk_user_id: user.id,
            company_name: contactData.company_name,
            contact_name: contactData.contact_name,
            email: contactData.email,
            phone: contactData.phone,
            plan,
            status: 'active',
            unit_count: totalUnits,
          },
          { onConflict: 'clerk_user_id' }
        )
        .select()

      if (memberError) throw memberError

      const memberId = memberRows?.[0]?.id

      // 2. Insert properties if any
      if (properties.length > 0 && memberId) {
        const propertyRows = properties.map(p => ({
          enterprise_member_id: memberId,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          property_type: p.property_type,
          unit_count: parseInt(p.unit_count) || 1,
        }))

        const { error: propError } = await supabase
          .from('enterprise_properties')
          .insert(propertyRows)

        if (propError) throw propError
      }

      // 3. Send welcome email
      try {
        await fetch('/api/enterprise/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: contactData.contact_name,
            email: contactData.email,
            plan,
          }),
        })
      } catch {
        // Non-fatal — don't block navigation if welcome email fails
      }

      // 4. Navigate to dashboard
      navigate('/enterprise/dashboard')
    } catch (err) {
      console.error('Enterprise onboarding error:', err)
      setError(err?.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: S.black,
        fontFamily: C.body,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '18px 24px',
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <span
          style={{
            fontFamily: C.display,
            fontSize: '22px',
            color: S.green,
            letterSpacing: '-0.01em',
          }}
        >
          SUBS
        </span>
        <span
          style={{
            color: S.muted,
            fontSize: '13px',
            fontFamily: C.body,
            fontWeight: 500,
            paddingLeft: '12px',
            borderLeft: `1px solid ${S.border}`,
          }}
        >
          Setup
        </span>
      </nav>

      {/* Page body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px 80px',
        }}
      >
        {/* Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: '12px',
            padding: '40px',
          }}
        >
          <ProgressIndicator currentStep={step} />

          {step === 1 && (
            <Step1
              data={contactData}
              onChange={handleContactChange}
              onContinue={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <Step2
              properties={properties}
              onPropertiesChange={setProperties}
              onContinue={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <Step3
              contactData={contactData}
              properties={properties}
              onConfirm={handleConfirm}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { S, C } from '../theme'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleStep1 = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setStep(2) }, 800)
  }

  const handleStep2 = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/admin/dashboard') }, 800)
  }

  const inp = { width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '13px 14px', color: S.offwhite, fontSize: 15, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a0f0f', border: '1px solid #3a1a1a', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 12 }}>🔒</span>
              <span style={{ color: S.danger, fontSize: 12, fontWeight: 600 }}>Admin Access Only</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 8 }}>
              {step === 1 ? 'Admin login.' : 'Verify identity.'}
            </div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>
              {step === 1 ? 'Restricted to authorized SUBS administrators.' : 'Enter the 6-digit code sent to your email.'}
            </p>
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
            {step === 1 ? (
              <form onSubmit={handleStep1}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Admin email</label>
                  <input style={inp} type="email" placeholder="admin@subs.co" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Password</label>
                  <input style={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? '#3a1a1a' : S.danger, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Verifying...' : 'Continue →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleStep2}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
                  <div style={{ fontSize: 13, color: S.muted }}>Code sent to {form.email || 'admin@subs.co'}</div>
                  <div style={{ fontSize: 11, color: S.green, marginTop: 4 }}>Demo: any 6-digit code works</div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>6-digit code</label>
                  <input style={{ ...inp, fontSize: 24, textAlign: 'center', letterSpacing: '0.3em' }} type="text" maxLength={6} placeholder="000000" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? S.greenDim : S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Verifying...' : 'Access Dashboard'}
                </button>
                <button type="button" onClick={() => setStep(1)} style={{ width: '100%', background: 'transparent', border: 'none', color: S.muted, fontSize: 13, padding: '10px 0', cursor: 'pointer', marginTop: 4 }}>
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

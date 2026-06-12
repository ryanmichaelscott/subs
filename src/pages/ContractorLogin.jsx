import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { S, C } from '../theme'

export default function ContractorLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/contractor/dashboard', { state: { firstTime: true } }) }, 900)
  }

  const inp = { width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '13px 14px', color: S.offwhite, fontSize: 15, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <Link to="/login" style={{ fontSize: 13, color: S.muted }}>Homeowner? Member login</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, display: 'inline-block' }} />
              <span style={{ color: S.green, fontSize: 12, fontWeight: 600 }}>Contractor Portal</span>
            </div>
            <div style={{ fontFamily: C.display, fontSize: 34, color: S.offwhite, marginBottom: 8 }}>Partner sign in.</div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>Access your lead inbox and rate card.</p>
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Email</label>
                <input style={inp} type="email" placeholder="contractor@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Password</label>
                <input style={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? S.greenDim : S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: S.muted }}>Demo: any credentials work</div>
          </div>

          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.offwhite, marginBottom: 8 }}>Not a SUBS partner yet?</div>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.5, marginBottom: 14, margin: '0 0 14px' }}>Join our vetted contractor network. Pre-qualified homeowners sent directly to you. Zero lead cost.</p>
            <Link to="/">
              <button style={{ background: 'transparent', border: `1px solid ${S.border}`, color: S.offwhite, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }}>
                Apply to join →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

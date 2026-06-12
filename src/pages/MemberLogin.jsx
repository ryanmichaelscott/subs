import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { S, C } from '../theme'

export default function MemberLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', zip: '', tier: 'plus' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard', { state: { zip: form.zip || '84101' } })
    }, 900)
  }

  const inp = { width: '100%', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '13px 14px', color: S.offwhite, fontSize: 15, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ background: S.black, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ height: 58, borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: C.body, fontSize: 18, fontWeight: 800, color: S.green, letterSpacing: '0.06em' }}>SUBS</Link>
        <Link to="/contractor/login" style={{ fontSize: 13, color: S.muted }}>Contractor? Sign in here</Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: C.display, fontSize: 36, color: S.offwhite, marginBottom: 8 }}>
              {mode === 'login' ? 'Welcome back.' : 'Join SUBS.'}
            </div>
            <p style={{ fontSize: 14, color: S.muted, margin: 0 }}>
              {mode === 'login' ? 'Sign in to access your member dashboard.' : 'Unlock contractor pricing on every trade.'}
            </p>
          </div>

          <div style={{ display: 'flex', background: S.surface, borderRadius: 12, padding: 4, border: `1px solid ${S.border}`, marginBottom: 24 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, background: mode === m ? S.card : 'transparent', border: mode === m ? `1px solid ${S.border}` : '1px solid transparent', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, color: mode === m ? S.offwhite : S.muted, cursor: 'pointer' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 28 }}>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600, color: S.offwhite, cursor: 'pointer', marginBottom: 20 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 12.08 17.64 9.773 17.64 9.2z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9.009 9.009 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: S.border }} />
              <span style={{ fontSize: 12, color: S.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: S.border }} />
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Full name</label>
                  <input style={inp} type="text" placeholder="Ryan Scott" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Email</label>
                <input style={inp} type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: mode === 'signup' ? 14 : 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>Password</label>
                <input style={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              {mode === 'signup' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 6, fontWeight: 500 }}>
                    Your zip code
                    <span style={{ fontWeight: 400, color: S.muted, marginLeft: 6 }}>— so we can match you with local contractors</span>
                  </label>
                  <input style={{ ...inp, maxWidth: 160 }} type="text" maxLength={5} placeholder="84101"
                    value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value.replace(/\D/g, '') }))} />
                </div>
              )}
              {mode === 'signup' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, color: S.muted, marginBottom: 8, fontWeight: 500 }}>Membership tier</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ id: 'member', label: 'Member', price: '$99' }, { id: 'plus', label: 'Member+', price: '$199' }, { id: 'elite', label: 'Elite', price: '$399' }].map(t => (
                      <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, tier: t.id }))}
                        style={{ flex: 1, background: form.tier === t.id ? S.greenDim : S.surface, border: `1px solid ${form.tier === t.id ? S.green : S.border}`, borderRadius: 8, padding: '10px 4px', cursor: 'pointer' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: form.tier === t.id ? S.green : S.offwhite }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: S.muted }}>{t.price}/yr</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? S.greenDim : S.green, border: 'none', color: S.black, fontSize: 15, fontWeight: 700, padding: '13px 0', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
                <span style={{ color: S.green, cursor: 'pointer' }}>Forgot password?</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: S.muted }}>Demo: any credentials work</div>
        </div>
      </div>
    </div>
  )
}

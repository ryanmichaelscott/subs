import { Component, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import Marketing from './pages/Marketing'
import MemberLogin from './pages/MemberLogin'
import CheckoutPage from './pages/CheckoutPage'
import MemberDashboard from './pages/MemberDashboard'
import ContractorLogin from './pages/ContractorLogin'
import ContractorCheckoutPage from './pages/ContractorCheckoutPage'
import ContractorPaymentSuccess from './pages/ContractorPaymentSuccess'
import ContractorApply from './pages/ContractorApply'
import ContractorDashboard from './pages/ContractorDashboard'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import WaitlistPage from './pages/WaitlistPage'
import ProtectedRoute from './components/ProtectedRoute'

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#0C0F0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F0EEE8' }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#8A9088', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error.message || 'An unexpected error occurred. Please refresh the page or contact support.'}
          </div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: '#5DFF8A', border: 'none', color: '#0C0F0A', fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 9, cursor: 'pointer' }}>
            Refresh page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function RefCapture() {
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('subs_ref', ref)
  }, [])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<RefCapture />} />
        <Route path="/" element={<Marketing />} />
        <Route path="/signup" element={<Marketing />} />
        <Route path="/login" element={<MemberLogin />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute role="member"><MemberDashboard /></ProtectedRoute>
        } />
        <Route path="/dashboard/*" element={
          <ProtectedRoute role="member"><MemberDashboard /></ProtectedRoute>
        } />
        <Route path="/contractor/login" element={<ContractorLogin />} />
        <Route path="/contractor/checkout" element={<ContractorCheckoutPage />} />
        <Route path="/contractor/payment-success" element={<ContractorPaymentSuccess />} />
        <Route path="/contractor/apply" element={<ContractorApply />} />
        <Route path="/contractor/dashboard" element={
          <DashboardErrorBoundary>
            <ProtectedRoute role="contractor"><ContractorDashboard /></ProtectedRoute>
          </DashboardErrorBoundary>
        } />
        <Route path="/contractor/*" element={
          <DashboardErrorBoundary>
            <ProtectedRoute role="contractor"><ContractorDashboard /></ProtectedRoute>
          </DashboardErrorBoundary>
        } />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

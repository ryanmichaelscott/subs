import { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import AdminServiceMaps from './pages/AdminServiceMaps'
import AdminReferrals from './pages/AdminReferrals'
import AdminMarketIntel from './pages/AdminMarketIntel'
import CalculatorPage from './pages/CalculatorPage'
import WaitlistPage from './pages/WaitlistPage'
import NpsPage from './pages/NpsPage'
import SmsConsent from './pages/SmsConsent'
import PropertyManagers from './pages/PropertyManagers'
import EnterpriseDashboard from './pages/EnterpriseDashboard'
import EnterpriseOnboarding from './pages/EnterpriseOnboarding'
import LegalPage from './pages/LegalPage'
import UtahLanding from './pages/UtahLanding'
import WelcomePage from './pages/WelcomePage'
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
        <div style={{ background: '#F7F3E9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1E2A23' }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#6A7466', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error.message || 'An unexpected error occurred. Please refresh the page or contact support.'}
          </div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: '#175A41', border: 'none', color: '#F7F3E9', fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 9, cursor: 'pointer' }}>
            Refresh page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Capture ?ref=CODE from any landing URL so it survives navigation to checkout
try {
  const refParam = new URLSearchParams(window.location.search).get('ref')
  if (refParam) localStorage.setItem('subs_ref', refParam.toUpperCase().trim())
} catch { /* private browsing */ }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketing />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/signup" element={<Marketing />} />
        <Route path="/login" element={<MemberLogin />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/nps" element={<NpsPage />} />
        <Route path="/sms-consent" element={<SmsConsent />} />
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
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/service-maps" element={
          <ProtectedRoute role="admin"><AdminServiceMaps /></ProtectedRoute>
        } />
        <Route path="/admin/referrals" element={
          <ProtectedRoute role="admin"><AdminReferrals /></ProtectedRoute>
        } />
        <Route path="/admin/market-intel" element={
          <ProtectedRoute role="admin"><AdminMarketIntel /></ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/property-managers" element={<PropertyManagers />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/refund-policy" element={<LegalPage />} />
        <Route path="/member-agreement" element={<LegalPage />} />
        <Route path="/enterprise/dashboard" element={
          <DashboardErrorBoundary>
            <ProtectedRoute role="enterprise"><EnterpriseDashboard /></ProtectedRoute>
          </DashboardErrorBoundary>
        } />
        <Route path="/enterprise/onboarding" element={
          <ProtectedRoute role="enterprise"><EnterpriseOnboarding /></ProtectedRoute>
        } />
        <Route path="/enterprise/*" element={
          <DashboardErrorBoundary>
            <ProtectedRoute role="enterprise"><EnterpriseDashboard /></ProtectedRoute>
          </DashboardErrorBoundary>
        } />
        <Route path="/utah" element={<UtahLanding />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

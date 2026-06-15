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
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketing />} />
        <Route path="/signup" element={<Marketing />} />
        <Route path="/login" element={<MemberLogin />} />
        <Route path="/checkout" element={<CheckoutPage />} />
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
          <ProtectedRoute role="contractor"><ContractorDashboard /></ProtectedRoute>
        } />
        <Route path="/contractor/*" element={
          <ProtectedRoute role="contractor"><ContractorDashboard /></ProtectedRoute>
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

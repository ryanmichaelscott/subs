import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Marketing from './pages/Marketing'
import MemberLogin from './pages/MemberLogin'
import MemberDashboard from './pages/MemberDashboard'
import ContractorLogin from './pages/ContractorLogin'
import ContractorDashboard from './pages/ContractorDashboard'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketing />} />
        <Route path="/login" element={<MemberLogin />} />
        <Route path="/dashboard" element={<MemberDashboard />} />
        <Route path="/contractor/login" element={<ContractorLogin />} />
        <Route path="/contractor/dashboard" element={<ContractorDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
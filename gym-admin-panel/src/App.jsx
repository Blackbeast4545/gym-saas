import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { FeatureProvider, FeatureGate } from './contexts/FeatureContext'
import Layout from './components/Layout'

// Expose toast to API interceptor for demo mode messages
window.__demoToast = toast

import Login        from './pages/auth/Login'
import Dashboard    from './pages/dashboard/Dashboard'
import Members      from './pages/members/Members'
import Plans        from './pages/members/Plans'
import Payments     from './pages/payments/Payments'
import Attendance   from './pages/attendance/Attendance'
import QRPage       from './pages/qr/QRPage'
import Workout      from './pages/workout/Workout'
import Diet         from './pages/diet/Diet'
import Staff        from './pages/staff/Staff'
import Notify       from './pages/notifications/Notify'
import Settings     from './pages/settings/Settings'
import BodyMeasurements from './pages/measurements/BodyMeasurements'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  return user ? children : <Navigate to="/login" replace/>
}

export default function App() {
  return (
    <AuthProvider>
      <FeatureProvider>
        <BrowserRouter>
          <Toaster position="top-right"
            toastOptions={{ style: { fontFamily:'Inter,sans-serif', fontSize:'14px' } }}/>
          <Routes>
            <Route path="/login" element={<Login/>}/>
            <Route path="/" element={<Guard><Layout/></Guard>}>
              {/* Always available on all plans */}
              <Route index           element={<Dashboard/>}/>
              <Route path="members"  element={<Members/>}/>
              <Route path="plans"    element={<Plans/>}/>
              <Route path="payments" element={<Payments/>}/>
              <Route path="attendance" element={<Attendance/>}/>
              <Route path="qr"       element={<QRPage/>}/>

              {/* Feature-gated: Pro and above */}
              <Route path="workout"  element={
                <FeatureGate feature="workout_plans"><Workout/></FeatureGate>
              }/>
              <Route path="diet"     element={
                <FeatureGate feature="diet_plans"><Diet/></FeatureGate>
              }/>
              <Route path="measurements" element={
                <FeatureGate feature="body_measurements"><BodyMeasurements/></FeatureGate>
              }/>
              <Route path="staff"    element={
                <FeatureGate feature="staff_management"><Staff/></FeatureGate>
              }/>

              {/* Always available */}
              <Route path="notify"   element={<Notify/>}/>
              <Route path="settings" element={<Settings/>}/>
            </Route>
            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </BrowserRouter>
      </FeatureProvider>
    </AuthProvider>
  )
}

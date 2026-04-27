import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFeature, ProBadge } from '../contexts/FeatureContext'
import {
  LayoutDashboard, Users, Receipt, QrCode,
  Dumbbell, Utensils, UserCheck, Bell,
  UserCog, LogOut, ChevronRight, Menu, X,
  Settings, Ruler
} from 'lucide-react'
import { useState } from 'react'

// feature key = null means always available
const allNav = [
  { to: '/',            label: 'Dashboard',  icon: LayoutDashboard, roles: ['owner','receptionist','trainer'], feature: null },
  { to: '/members',     label: 'Members',    icon: Users,            roles: ['owner','receptionist','trainer'], feature: null },
  { to: '/attendance',  label: 'Attendance', icon: UserCheck,        roles: ['owner','receptionist','trainer'], feature: null },
  { to: '/payments',    label: 'Payments',   icon: Receipt,          roles: ['owner','receptionist'],           feature: null },
  { to: '/qr',          label: 'QR Code',    icon: QrCode,           roles: ['owner','receptionist'],           feature: null },
  { to: '/workout',     label: 'Workouts',   icon: Dumbbell,         roles: ['owner','receptionist','trainer'], feature: 'workout_plans' },
  { to: '/diet',        label: 'Diet Plans', icon: Utensils,         roles: ['owner','receptionist','trainer'], feature: 'diet_plans' },
  { to: '/measurements',label: 'Body Stats', icon: Ruler,            roles: ['owner','receptionist','trainer'], feature: 'body_measurements' },
  { to: '/notify',      label: 'Notify',     icon: Bell,             roles: ['owner','receptionist'],           feature: null },
  { to: '/staff',       label: 'Staff',      icon: UserCog,          roles: ['owner'],                          feature: 'staff_management' },
  { to: '/settings',    label: 'Settings',   icon: Settings,         roles: ['owner'],                          feature: null },
]

function SidebarContent({ user, logout, onClose }) {
  const navigate = useNavigate()
  const { can, upgradeMap } = useFeature()
  const nav = allNav.filter(n => n.roles.includes(user?.role))

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">FitNexus</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role} Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, feature }) => {
          const locked = feature && !can(feature)
          const badgePlan = feature ? (upgradeMap[feature] || 'pro').toUpperCase() : null

          return (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-primary/10 text-primary'
                  : locked
                    ? 'text-gray-400 hover:bg-gray-50'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
              }>
              <Icon className={`w-4 h-4 flex-shrink-0 ${locked ? 'opacity-50' : ''}`}/>
              <span className={locked ? 'opacity-60' : ''}>{label}</span>
              {locked && <ProBadge plan={badgePlan}/>}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4"/>Sign out
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobile] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-col flex-shrink-0">
        <SidebarContent user={user} logout={logout}/>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <SidebarContent user={user} logout={logout} onClose={() => setMobile(false)}/>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setMobile(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5"/>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="font-bold text-sm">FitNexus</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}

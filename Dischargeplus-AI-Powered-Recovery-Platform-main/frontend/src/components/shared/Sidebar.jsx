import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, UserPlus, GitBranch, BarChart3,
  Stethoscope, ClipboardList, MessageSquare, Video,
  Heart, FileText, Pill, LogOut, Menu, X, Activity, AlertCircle
} from 'lucide-react'
import useStore from '../../store/useStore'

const navItems = {
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/doctors', icon: Stethoscope, label: 'Doctors' },
    { to: '/admin/patients', icon: Users, label: 'Patients' },
    { to: '/admin/assignments', icon: GitBranch, label: 'Assignments' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/complaints', icon: AlertCircle, label: 'Complaints' },
  ],
  doctor: [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/send-survey', icon: ClipboardList, label: 'Send Survey' },
    { to: '/doctor/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/doctor/call', icon: Video, label: 'Video Call' },
  ],
  patient: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/survey', icon: ClipboardList, label: 'Survey' },
    { to: '/patient/reports', icon: FileText, label: 'Report Analyzer' },
    { to: '/patient/medications', icon: Pill, label: 'Medications' },
    { to: '/patient/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/patient/call', icon: Video, label: 'Video Call' },
    { to: '/patient/complaints', icon: AlertCircle, label: 'Complaints' },
  ],
}

export default function Sidebar() {
  const { user, logout, sidebarOpen, toggleSidebar } = useStore()
  const navigate = useNavigate()
  const role = user?.role || 'admin'
  const items = navItems[role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg md:hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <motion.aside
        initial={{ x: -260 }}
        animate={{ x: sidebarOpen ? 0 : -260 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 260,
          background: '#FFFFFF',
          borderRight: '1px solid var(--border)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 40 }}>
          <img src="/hospital.jpg" alt="Discharge+ Logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
          <span style={{ fontSize: 20, fontWeight: 700 }} className="gradient-text">Discharge+</span>
        </div>

        {/* Role badge */}
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 24,
          background: 'var(--accent-light)', fontSize: 12, fontWeight: 600,
          color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px',
          textAlign: 'center'
        }}>
          {role} Portal
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              })}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)' }}>
            {user?.full_name || 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            {user?.email || ''}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10, width: '100%',
              background: 'rgba(239,68,68,0.08)', color: '#EF4444',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </motion.aside>
    </>
  )
}

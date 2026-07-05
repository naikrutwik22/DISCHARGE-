import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Heart, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function PatientLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try { await login(email, password) }
    catch (err) { setError(err.response?.data?.detail || 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card" style={{ width: '100%', maxWidth: 440, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/patient.jpg" alt="Patient Logo" style={{ width: 72, height: 72, borderRadius: 16, margin: '0 auto 16px', display: 'block', objectFit: 'cover' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, fontWeight: 600, marginTop: 4 }}>Patient</p>
        </div>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#FF4757' }}>
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label className="input-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" className="input-field" style={{ paddingLeft: 40 }} placeholder="patient@hospital.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: 28 }}>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" className="input-field" style={{ paddingLeft: 40 }} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In as Patient'}
          </button>
        </form>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <Link to="/login" className="login-link-btn">Admin Portal</Link>
          <Link to="/doctor-login" className="login-link-btn">Doctor Portal</Link>
        </div>
      </motion.div>
    </div>
  )
}

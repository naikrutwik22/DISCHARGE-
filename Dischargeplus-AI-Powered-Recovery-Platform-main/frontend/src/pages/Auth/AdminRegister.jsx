import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Mail, Lock, User, Phone, MapPin, Activity, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const Field = ({ label, icon: Icon, type = 'text', placeholder, required = true, value, onChange, toggleShowHide, showToggle, isHidden }) => (
  <div style={{ marginBottom: 16 }}>
    <label className="input-label">{label}</label>
    <div style={{ position: 'relative' }}>
      <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      <input
        type={type}
        className="input-field"
        style={{ paddingLeft: 40, paddingRight: showToggle ? 40 : 12 }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      {showToggle && (
        <button
          type="button"
          onClick={toggleShowHide}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
        >
          {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      )}
    </div>
  </div>
)

export default function AdminRegister() {
  const [form, setForm] = useState({
    email: '', password: '', full_name: '',
    hospital_name: '', hospital_address: '', hospital_city: '',
    hospital_state: '', hospital_phone: '', hospital_email: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { adminRegister } = useAuth()

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const validateForm = () => {
    if (!form.full_name.trim()) {
      setError('Full Name is required')
      return false
    }
    if (form.full_name.trim().length < 2) {
      setError('Full Name must be at least 2 characters')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    if (!form.hospital_name.trim()) {
      setError('Hospital Name is required')
      return false
    }
    if (form.hospital_name.trim().length < 3) {
      setError('Hospital Name must be at least 3 characters')
      return false
    }
    if (form.hospital_phone) {
      const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/
      if (!phoneRegex.test(form.hospital_phone)) {
        setError('Please enter a valid hospital phone number (min 10 digits)')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return
    setLoading(true)
    try {
      const payload = { ...form }
      // Remove empty optional string fields so Backend uses default None
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key]
      })

      await adminRegister(payload)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join(' | '))
      } else {
        setError(detail || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: 540, padding: 40, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/hospital.jpg" alt="Hospital Logo" style={{ width: 72, height: 72, borderRadius: 16, margin: '0 auto 16px', display: 'block', objectFit: 'cover' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create Hospital Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Register your hospital on Discharge+
          </p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#FF4757' }}>
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Admin Details
          </p>
          <Field label="Full Name" icon={User} value={form.full_name} onChange={set('full_name')} placeholder="John Doe" />
          <Field label="Email" icon={Mail} type="email" value={form.email} onChange={set('email')} placeholder="admin@hospital.com" />
          <Field
            label="Password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            placeholder="Min 8 characters"
            showToggle={true}
            isHidden={!showPassword}
            toggleShowHide={() => setShowPassword(!showPassword)}
          />

          <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

          <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Hospital Details
          </p>
          <Field label="Hospital Name" icon={Building2} value={form.hospital_name} onChange={set('hospital_name')} placeholder="City General Hospital" />
          <Field label="Address" icon={MapPin} value={form.hospital_address} onChange={set('hospital_address')} placeholder="123 Main St" required={false} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <label className="input-label">City</label>
              <input className="input-field" placeholder="Mumbai" value={form.hospital_city} onChange={set('hospital_city')} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="input-label">State</label>
              <input className="input-field" placeholder="Maharashtra" value={form.hospital_state} onChange={set('hospital_state')} />
            </div>
          </div>

          <Field label="Hospital Phone" icon={Phone} value={form.hospital_phone} onChange={set('hospital_phone')} placeholder="+91 9876543210" required={false} />

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register Hospital'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
          Already registered? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </p>
      </motion.div>
    </div>
  )
}

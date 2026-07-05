import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, X, Copy, Check } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', specialization: '', department: '', license_number: '', qualification: '', experience_years: '', bio: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchDoctors = async () => {
    try { const res = await api.get('/admin/doctors'); setDoctors(res.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDoctors() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.post('/admin/doctors', { ...form, experience_years: form.experience_years ? parseInt(form.experience_years) : null })
      setCredentials(res.data)
      fetchDoctors()
      setForm({ email: '', full_name: '', phone: '', specialization: '', department: '', license_number: '', qualification: '', experience_years: '', bio: '' })
    } catch (e) { alert(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const copyCredentials = () => {
    if (credentials) {
      navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const filtered = doctors.filter(d => d.full_name?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 className="page-title">Doctors</h1>
              <p className="page-subtitle">{doctors.length} doctors registered</p>
            </div>
            <button className="btn-primary" onClick={() => { setShowModal(true); setCredentials(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Doctor
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: 40, maxWidth: 360 }} placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Specialization</th><th>Department</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.full_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{d.email}</td>
                    <td>{d.specialization || '—'}</td>
                    <td>{d.department || '—'}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: d.is_available ? 'rgba(46,213,115,0.15)' : 'rgba(255,71,87,0.15)', color: d.is_available ? '#2ED573' : '#FF4757' }}>
                        {d.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No doctors found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600 }}>Add Doctor</h2>
                  <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                </div>

                {credentials ? (
                  <div>
                    <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>✓ Doctor Created Successfully</p>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email:</span>
                        <p style={{ fontFamily: 'monospace', fontSize: 14 }}>{credentials.email}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Password:</span>
                        <p style={{ fontFamily: 'monospace', fontSize: 14 }}>{credentials.password}</p>
                      </div>
                    </div>
                    <button className="btn-secondary" onClick={copyCredentials} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Credentials</>}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreate}>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {[
                        { f: 'full_name', l: 'Full Name', r: true },
                        { f: 'email', l: 'Email', r: true, t: 'email' },
                        { f: 'phone', l: 'Phone' },
                        { f: 'specialization', l: 'Specialization' },
                        { f: 'department', l: 'Department' },
                        { f: 'license_number', l: 'License Number' },
                        { f: 'qualification', l: 'Qualification' },
                        { f: 'experience_years', l: 'Experience (years)', t: 'number' },
                      ].map(({ f, l, r, t }) => (
                        <div key={f}>
                          <label className="input-label">{l}</label>
                          <input className="input-field" type={t || 'text'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={r} />
                        </div>
                      ))}
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Doctor'}
                    </button>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

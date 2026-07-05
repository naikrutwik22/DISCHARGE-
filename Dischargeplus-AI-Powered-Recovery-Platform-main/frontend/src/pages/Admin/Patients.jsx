import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Upload, X, Copy, Check } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import RiskBadge from '../../components/shared/RiskBadge'
import api from '../../lib/api'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', date_of_birth: '', gender: '', blood_group: '', diagnosis: '', discharge_date: '', discharge_summary: '', emergency_contact_name: '', emergency_contact_phone: '', expected_recovery_days: '30' })
  const [submitting, setSubmitting] = useState(false)

  const fetchPatients = async () => {
    try { const res = await api.get('/admin/patients'); setPatients(res.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPatients() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.post('/admin/patients', { ...form, expected_recovery_days: parseInt(form.expected_recovery_days) || 30 })
      setCredentials(res.data)
      fetchPatients()
    } catch (e) { alert(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/admin/patients/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      alert(`${res.data.message}. Errors: ${res.data.errors.length}`)
      fetchPatients()
    } catch (e) { alert('Import failed') }
    finally { setUploading(false) }
  }

  const filtered = patients.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.diagnosis?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="page-title">Patients</h1>
              <p className="page-subtitle">{patients.length} patients registered</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <Upload size={16} /> CSV Import
                <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
              </label>
              <button className="btn-primary" onClick={() => { setShowModal(true); setCredentials(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> Add Patient
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: 40, maxWidth: 360 }} placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Diagnosis</th><th>Discharge Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.full_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                    <td>{p.diagnosis || '—'}</td>
                    <td>{p.discharge_date || '—'}</td>
                    <td>{p.is_readmitted ? <RiskBadge level="high" /> : <RiskBadge level="low" />}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No patients found</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.div>

        <AnimatePresence>
          {showModal && (
            <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
              <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600 }}>Add Patient</h2>
                  <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                </div>

                {credentials ? (
                  <div>
                    <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>✓ Patient Created Successfully</p>
                      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email:</span><p style={{ fontFamily: 'monospace', fontSize: 14 }}>{credentials.email}</p></div>
                      <div><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Password:</span><p style={{ fontFamily: 'monospace', fontSize: 14 }}>{credentials.password}</p></div>
                    </div>
                    <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Credentials</>}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreate}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { f: 'full_name', l: 'Full Name', r: true, full: true },
                        { f: 'email', l: 'Email', r: true, t: 'email' },
                        { f: 'phone', l: 'Phone' },
                        { f: 'date_of_birth', l: 'Date of Birth', t: 'date' },
                        { f: 'gender', l: 'Gender' },
                        { f: 'blood_group', l: 'Blood Group' },
                        { f: 'diagnosis', l: 'Diagnosis', full: true },
                        { f: 'discharge_date', l: 'Discharge Date', t: 'date' },
                        { f: 'expected_recovery_days', l: 'Recovery Days', t: 'number' },
                        { f: 'emergency_contact_name', l: 'Emergency Contact' },
                        { f: 'emergency_contact_phone', l: 'Emergency Phone' },
                      ].map(({ f, l, r, t, full }) => (
                        <div key={f} style={full ? { gridColumn: '1 / -1' } : {}}>
                          <label className="input-label">{l}</label>
                          <input className="input-field" type={t || 'text'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={r} />
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="input-label">Discharge Summary</label>
                        <textarea className="input-field" rows={3} value={form.discharge_summary} onChange={(e) => setForm({ ...form, discharge_summary: e.target.value })} style={{ resize: 'vertical' }} />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Patient'}
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

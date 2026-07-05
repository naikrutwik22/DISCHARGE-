import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Plus, Trash2 } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [selectedPatient, setSelectedPatient] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [a, d, p] = await Promise.all([
          api.get('/admin/assignments'), api.get('/admin/doctors'), api.get('/admin/patients'),
        ])
        setAssignments(a.data); setDoctors(d.data); setPatients(p.data)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const handleAssign = async () => {
    if (!selectedDoctor || !selectedPatient) return alert('Select both doctor and patient')
    try {
      await api.post('/admin/assignments', { doctor_id: selectedDoctor, patient_id: selectedPatient })
      const res = await api.get('/admin/assignments')
      setAssignments(res.data)
      setSelectedDoctor(''); setSelectedPatient('')
    } catch (e) { alert(e.response?.data?.detail || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this assignment?')) return
    try {
      await api.delete(`/admin/assignments/${id}`)
      setAssignments(assignments.filter(a => a.id !== id))
    } catch (e) { alert('Failed') }
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Assignments</h1>
            <p className="page-subtitle">Assign patients to doctors</p>
          </div>

          {/* Assignment Form */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={18} color="var(--accent)" /> New Assignment
            </h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="input-label">Doctor</label>
                <select className="input-field" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                  <option value="">Select Doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization || 'General'}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="input-label">Patient</label>
                <select className="input-field" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} — {p.diagnosis || 'N/A'}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={handleAssign} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Assign
              </button>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr><th>Doctor</th><th>Patient</th><th>Status</th><th>Created</th><th>Action</th></tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.doctor_name || '—'}</td>
                    <td>{a.patient_name || '—'}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: a.is_active ? 'rgba(46,213,115,0.15)' : 'rgba(255,71,87,0.15)', color: a.is_active ? '#2ED573' : '#FF4757' }}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => handleDelete(a.id)} style={{ background: 'rgba(255,71,87,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#FF4757' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No assignments yet</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

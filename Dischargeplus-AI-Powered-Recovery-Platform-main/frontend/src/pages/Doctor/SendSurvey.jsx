import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Send, Eye } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

const QUESTION_TYPES = [
  { id: 'fever', label: 'Temperature / Fever', desc: 'Body temperature in °F' },
  { id: 'spo2', label: 'SpO2', desc: 'Oxygen saturation percentage' },
  { id: 'bp', label: 'Blood Pressure', desc: 'Systolic / Diastolic reading' },
  { id: 'sugar', label: 'Blood Sugar', desc: 'Blood glucose in mg/dL' },
  { id: 'pain', label: 'Pain Level', desc: 'Pain slider 0-10' },
  { id: 'photo', label: 'Photo / Video Upload', desc: 'Wound or affected area media' },
  { id: 'voice', label: 'Voice Note', desc: 'Audio recording of symptoms' },
  { id: 'custom_text', label: 'Custom Text', desc: 'Free-text response' },
]

export default function SendSurvey() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [scheduleType, setScheduleType] = useState('one_time')
  const [intervalDays, setIntervalDays] = useState('')
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/doctor/patients').then(res => setPatients(res.data)).catch(() => {})
  }, [])

  const toggleType = (id) => {
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handleSend = async () => {
    if (!selectedPatient || !title || selectedTypes.length === 0) return alert('Fill all required fields')
    setSending(true)
    try {
      await api.post('/surveys/create', {
        patient_id: selectedPatient,
        title,
        description,
        question_types: selectedTypes,
        schedule_type: scheduleType,
        schedule_interval_days: intervalDays ? parseInt(intervalDays) : null,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      setTitle(''); setDescription(''); setSelectedTypes([]); setSelectedPatient('')
    } catch (e) { alert(e.response?.data?.detail || 'Failed') }
    finally { setSending(false) }
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Send Survey</h1>
            <p className="page-subtitle">Create and send a health check survey to a patient</p>
          </div>

          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(46,213,115,0.1)', border: '1px solid rgba(46,213,115,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, color: '#2ED573', fontSize: 14, fontWeight: 500 }}>
              ✓ Survey sent successfully!
            </motion.div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
            {/* Builder */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Patient</label>
                <select className="input-field" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} — {p.diagnosis || 'N/A'}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Survey Title</label>
                <input className="input-field" placeholder="Daily Health Check" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Description (optional)</label>
                <textarea className="input-field" rows={2} placeholder="Brief description..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="input-label">Question Types</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {QUESTION_TYPES.map(q => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleType(q.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                        background: selectedTypes.includes(q.id) ? 'var(--accent-light)' : 'var(--bg-primary)',
                        border: `1px solid ${selectedTypes.includes(q.id) ? 'var(--accent)' : 'var(--border)'}`,
                        color: selectedTypes.includes(q.id) ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{q.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{q.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Schedule</label>
                  <select className="input-field" value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                    <option value="one_time">One-time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
                {scheduleType === 'recurring' && (
                  <div style={{ flex: 1 }}>
                    <label className="input-label">Every X Days</label>
                    <input className="input-field" type="number" min="1" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-secondary" onClick={() => setPreview(!preview)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={16} /> Preview
                </button>
                <button className="btn-primary" onClick={handleSend} disabled={sending} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Send size={16} /> {sending ? 'Sending...' : 'Send Survey'}
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="glass-card" style={{ padding: 20, height: 'fit-content' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} color="var(--accent)" /> Preview
              </h3>
              {selectedTypes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select question types to preview</p>
              ) : (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title || 'Untitled Survey'}</h4>
                  {selectedTypes.map((type, i) => {
                    const q = QUESTION_TYPES.find(t => t.id === type)
                    return (
                      <div key={type} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Q{i + 1}</span>
                        <p style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{q.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.desc}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Heart, Pill, FileText, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import RiskBadge from '../../components/shared/RiskBadge'
import TrendChart from '../../components/charts/TrendChart'
import api from '../../lib/api'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingMed, setAddingMed] = useState(false)
  const [medForm, setMedForm] = useState({ name: '', dosage: '', frequency: '', instructions: '' })

  useEffect(() => {
    const fetch = async () => {
      try {
        const [detail, notesRes] = await Promise.all([
          api.get(`/doctor/patients/${id}`),
          api.get(`/doctor/notes/${id}`),
        ])
        setData(detail.data)
        setNotes(notesRes.data.notes || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
  }, [id])

  const saveNote = async () => {
    if (!note.trim()) return
    try {
      await api.post('/doctor/notes', { patient_id: id, note })
      setNotes([...notes, { note, timestamp: new Date().toISOString() }])
      setNote('')
    } catch (e) { alert('Failed to save note') }
  }

  const saveMedication = async () => {
    if (!medForm.name.trim()) return
    try {
      const res = await api.post('/doctor/medications', { patient_id: id, ...medForm })
      setData(prev => ({ ...prev, medications: [...prev.medications, res.data] }))
      setMedForm({ name: '', dosage: '', frequency: '', instructions: '' })
      setAddingMed(false)
    } catch (e) { alert('Failed to prescribe medication') }
  }

  if (loading) return <div className="page-container"><Sidebar /><main className="main-content"><p>Loading...</p></main></div>
  if (!data) return <div className="page-container"><Sidebar /><main className="main-content"><p>Patient not found</p></main></div>

  const { patient, risk_history, survey_responses, medications } = data
  const latestRisk = risk_history[0]

  const getAge = (dob) => {
    if (!dob) return '—'
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Build trend data from survey responses
  const buildTrend = (type) => {
    return survey_responses.filter(s => s.response_answers?.length).flatMap(s =>
      s.response_answers.filter(a => a.question_type === type && a.answer_numeric != null).map(a => ({
        date: s.created_at?.slice(0, 10) || '',
        value: a.answer_numeric,
      }))
    ).reverse()
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 14 }}>
            <ArrowLeft size={16} /> Back to Patients
          </button>

          {/* Patient Header */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{patient.full_name}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{patient.diagnosis || 'No diagnosis'}</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>Age: {getAge(patient.date_of_birth)}</span>
                <span>Gender: {patient.gender || '—'}</span>
                <span>Blood: {patient.blood_group || '—'}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {latestRisk && <RiskBadge level={latestRisk.risk_level} size="lg" />}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Discharged: {patient.discharge_date || '—'}
              </p>
            </div>
          </div>

          {/* Latest Additional Responses */}
          {(() => {
            const latest = survey_responses.find(s => s.response_answers?.length > 0)
            const extra = latest?.response_answers?.filter(a => ['photo', 'voice', 'custom_text'].includes(a.question_type))
            if (!extra || extra.length === 0) return null
            
            return (
              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} color="var(--accent)" /> Latest Patient Feedback
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                    {new Date(latest.created_at).toLocaleDateString()}
                  </span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                  {extra.map(a => (
                    <div key={a.id || a.question_type} style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 8 }}>{a.question_type.replace('_', ' ')}</p>
                      {a.question_type === 'custom_text' && <p style={{ fontSize: 14 }}>{a.answer_value}</p>}
                      {a.question_type === 'photo' && a.file_url && a.file_url.startsWith('data:video/') && <video src={a.file_url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 150 }} />}
                      {a.question_type === 'photo' && a.file_url && !a.file_url.startsWith('data:video/') && <img src={a.file_url} alt="Patient upload" style={{ width: '100%', borderRadius: 8, maxHeight: 150, objectFit: 'cover' }} />}
                      {a.question_type === 'photo' && !a.file_url && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.answer_value || 'No media'}</p>}
                      {a.question_type === 'voice' && a.file_url && <audio src={a.file_url} controls style={{ width: '100%', height: 36 }} />}
                      {a.question_type === 'voice' && !a.file_url && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No audio</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Trend Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <TrendChart data={buildTrend('fever')} dataKey="value" title="Temperature (°F)" color="#FF6B6B" normalRange={[97, 99.5]} unit="°F" />
            <TrendChart data={buildTrend('spo2')} dataKey="value" title="SpO2 (%)" color="#00B4D8" normalRange={[95, 100]} unit="%" />
            <TrendChart data={buildTrend('bp')} dataKey="value" title="Blood Pressure (mmHg)" color="#FFA502" normalRange={[90, 140]} unit=" mmHg" />
            <TrendChart data={buildTrend('sugar')} dataKey="value" title="Blood Sugar (mg/dL)" color="#A29BFE" normalRange={[70, 140]} unit=" mg/dL" />
            <TrendChart data={buildTrend('pain')} dataKey="value" title="Pain Level (0-10)" color="#FF4757" normalRange={[0, 3]} unit=" / 10" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Medications */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill size={16} color="var(--accent)" /> Medications
                </h3>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setAddingMed(!addingMed)}>
                  {addingMed ? 'Cancel' : '+ Prescribe'}
                </button>
              </div>

              {addingMed && (
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                  <input className="input-field" placeholder="Medicine Name (e.g. Amoxicillin)" value={medForm.name} onChange={e => setMedForm({...medForm, name: e.target.value})} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <input className="input-field" placeholder="Dosage (e.g. 500mg)" value={medForm.dosage} onChange={e => setMedForm({...medForm, dosage: e.target.value})} />
                    <input className="input-field" placeholder="Frequency (e.g. Twice daily)" value={medForm.frequency} onChange={e => setMedForm({...medForm, frequency: e.target.value})} />
                  </div>
                  <input className="input-field" placeholder="Instructions/Timings (e.g. After meals)" value={medForm.instructions} onChange={e => setMedForm({...medForm, instructions: e.target.value})} style={{ marginBottom: 10 }} />
                  <button className="btn-primary" style={{ width: '100%' }} onClick={saveMedication}>Prescribe Medication</button>
                </div>
              )}

              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {medications.map((m) => (
                  <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{m.dosage} · {m.frequency}</span>
                    {m.instructions && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{m.instructions}</div>}
                  </div>
                ))}
                {medications.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No medications</p>}
              </div>
            </div>

            {/* Doctor Notes */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="var(--accent)" /> Private Notes
              </h3>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                {notes.map((n, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <p>{n.note}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.timestamp).toLocaleString()}</p>
                  </div>
                ))}
                {notes.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-field" placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNote()} />
                <button className="btn-primary" onClick={saveNote}>Save</button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

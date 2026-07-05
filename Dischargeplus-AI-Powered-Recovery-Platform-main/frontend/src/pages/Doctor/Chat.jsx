import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Paperclip, ArrowLeft } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import { useChat } from '../../hooks/useChat'
import useStore from '../../store/useStore'
import api from '../../lib/api'

export default function DoctorChat() {
  const { user } = useStore()
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const { messages, loading, sendMessage, markRead } = useChat(selectedPatient?.id)

  useEffect(() => {
    api.get('/doctor/patients').then(res => setPatients(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (selectedPatient) markRead()
  }, [messages, selectedPatient])

  const handleSend = async () => {
    if (!input.trim() || !selectedPatient) return
    const msg = input
    setInput('')
    try { await sendMessage(msg) } catch { setInput(msg) }
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content" style={{ padding: 0, display: 'flex', height: '100vh' }}>
        {/* Patient sidebar */}
        <div style={{ width: 280, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, padding: '8px 4px', marginBottom: 8 }}>Patients</h3>
          {patients.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPatient(p)}
              style={{
                padding: '12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                background: selectedPatient?.id === p.id ? 'var(--accent-light)' : 'transparent',
                border: selectedPatient?.id === p.id ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, color: selectedPatient?.id === p.id ? 'var(--accent)' : 'var(--text-primary)' }}>{p.full_name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.diagnosis || 'Patient'}</p>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedPatient ? (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selectedPatient.full_name}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedPatient.diagnosis}</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((m, i) => (
                  <div key={m.id || i} style={{ alignSelf: m.sender_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                      background: m.sender_id === user?.id ? 'var(--accent)' : 'var(--bg-card-light)',
                      color: m.sender_id === user?.id ? 'var(--bg-primary)' : 'var(--text-primary)',
                    }}>
                      {m.message}
                      {m.file_url && <a href={m.file_url} target="_blank" style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'inherit', textDecoration: 'underline' }}>📎 Attachment</a>}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: m.sender_id === user?.id ? 'right' : 'left' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                <input className="input-field" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} style={{ flex: 1 }} />
                <button className="btn-primary" onClick={handleSend} style={{ padding: '10px 16px' }}><Send size={18} /></button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a patient to start chatting
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

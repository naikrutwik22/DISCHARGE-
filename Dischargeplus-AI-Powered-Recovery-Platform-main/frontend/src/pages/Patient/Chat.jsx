import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import { useChat } from '../../hooks/useChat'
import useStore from '../../store/useStore'
import api from '../../lib/api'

export default function PatientChat() {
  const { user } = useStore()
  const [profile, setProfile] = useState(null)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    api.get('/patient/me').then(res => setProfile(res.data)).catch(() => {})
  }, [])

  const { messages, loading, sendMessage, markRead } = useChat(profile?.id)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (profile) markRead()
  }, [messages, profile])

  const handleSend = async () => {
    if (!input.trim() || !profile) return
    const msg = input
    setInput('')
    try { await sendMessage(msg) } catch { setInput(msg) }
  }

  const doctorName = profile?.doctors?.[0]?.full_name || 'Your Doctor'

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00B4D8, #0077B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
            {doctorName.charAt(0)}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{doctorName}</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{profile?.doctors?.[0]?.specialization || 'Doctor'}</p>
          </div>
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
      </main>
    </div>
  )
}

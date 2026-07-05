import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, PhoneOff, Phone, Mic, MicOff, VideoOff } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function PatientCallRoom() {
  const [callData, setCallData] = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [pendingCall, setPendingCall] = useState(null)

  // Check for incoming call notifications
  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get('/patient/notifications')
        const callNotif = res.data?.find(n => n.type === 'alert' && n.title?.includes('Incoming Call'))
        if (callNotif) {
          setPendingCall(callNotif.metadata || callNotif)
        }
      } catch {}
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  const joinCall = async () => {
    if (!pendingCall?.call_log_id) return
    try {
      const res = await api.post('/chat/calls/join-token', { call_log_id: pendingCall.call_log_id })
      setCallData(res.data)
      setCallActive(true)
      setPendingCall(null)
    } catch (e) { alert('Failed to join call') }
  }

  const endCall = async () => {
    if (callData?.call_log_id) {
      try { await api.post(`/chat/calls/${callData.call_log_id}/end`) } catch {}
    }
    setCallActive(false)
    setCallData(null)
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Video Call</h1>
            <p className="page-subtitle">Join a call with your doctor</p>
          </div>

          {!callActive ? (
            <div className="glass-card" style={{ padding: 32, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
              {pendingCall ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                    background: 'rgba(46,213,115,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'pulse-glow 2s infinite',
                  }}>
                    <Phone size={36} color="#2ED573" />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Incoming Call</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Your doctor is calling...</p>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <button onClick={joinCall} style={{
                      width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: '#2ED573', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Phone size={24} />
                    </button>
                    <button onClick={() => setPendingCall(null)} style={{
                      width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: '#FF4757', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PhoneOff size={24} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div>
                  <div style={{ width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px', background: 'var(--bg-card-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={36} color="var(--text-muted)" />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Active Calls</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>You'll be notified when your doctor calls</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden', aspectRatio: '16/9', maxHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Video size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>Connected to 100ms Room</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Room: {callData?.room_id || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button onClick={() => setAudioMuted(!audioMuted)} style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: audioMuted ? 'rgba(255,71,87,0.2)' : 'var(--bg-card-light)',
                  color: audioMuted ? '#FF4757' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {audioMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <button onClick={() => setVideoOff(!videoOff)} style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: videoOff ? 'rgba(255,71,87,0.2)' : 'var(--bg-card-light)',
                  color: videoOff ? '#FF4757' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {videoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
                <button onClick={endCall} style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: '#FF4757', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PhoneOff size={22} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

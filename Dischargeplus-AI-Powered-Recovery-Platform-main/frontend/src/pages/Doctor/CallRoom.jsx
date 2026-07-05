import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function DoctorCallRoom() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [callActive, setCallActive] = useState(false)
  const [callData, setCallData] = useState(null)
  const [audioMuted, setAudioMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)

  useEffect(() => {
    api.get('/doctor/patients').then(res => setPatients(res.data)).catch(() => {})
  }, [])

  const startCall = async () => {
    if (!selectedPatient) return alert('Select a patient')
    try {
      const res = await api.post('/chat/calls/create-room', { patient_id: selectedPatient, call_type: videoOff ? 'audio' : 'video' })
      setCallData(res.data)
      setCallActive(true)
      // In production: use 100ms SDK with res.data.token to join the room
    } catch (e) { alert(e.response?.data?.detail || 'Failed to create call') }
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
            <p className="page-subtitle">Start a video or audio call with a patient</p>
          </div>

          {!callActive ? (
            <div className="glass-card" style={{ padding: 32, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px', background: 'linear-gradient(135deg, var(--accent), #00B894)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={36} color="var(--bg-primary)" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Select Patient</label>
                <select className="input-field" value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                  <option value="">Choose a patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                <button onClick={() => setVideoOff(!videoOff)} className={videoOff ? 'btn-secondary' : 'btn-primary'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {videoOff ? <VideoOff size={16} /> : <Video size={16} />} {videoOff ? 'Audio Only' : 'Video Call'}
                </button>
              </div>
              <button className="btn-primary" onClick={startCall} style={{ width: '100%', padding: 14 }}>
                Start Call
              </button>
            </div>
          ) : (
            <div>
              {/* Call Room UI */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden', aspectRatio: '16/9', maxHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Video size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ fontSize: 14 }}>100ms Video Room</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Room ID: {callData?.room_id || '—'}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Integrate with @100mslive/react-sdk for live video
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button onClick={() => setAudioMuted(!audioMuted)} style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: audioMuted ? 'rgba(255,71,87,0.2)' : 'var(--bg-card-light)',
                  color: audioMuted ? '#FF4757' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {audioMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <button onClick={() => setVideoOff(!videoOff)} style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: videoOff ? 'rgba(255,71,87,0.2)' : 'var(--bg-card-light)',
                  color: videoOff ? '#FF4757' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {videoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
                <button onClick={endCall} style={{
                  width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: '#FF4757', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
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

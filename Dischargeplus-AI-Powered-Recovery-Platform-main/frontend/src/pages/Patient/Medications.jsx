import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pill, Check, X, Flame } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function Medications() {
  const [meds, setMeds] = useState([])
  const [logs, setLogs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/patient/medications')
        setMeds(res.data)
        // Fetch logs for each med
        const logsMap = {}
        for (const m of res.data) {
          try {
            const l = await api.get(`/patient/medications/${m.id}/logs`)
            logsMap[m.id] = l.data
          } catch { logsMap[m.id] = [] }
        }
        setLogs(logsMap)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const logMed = async (medId, status) => {
    try {
      await api.post(`/patient/medications/${medId}/log?status=${status}`)
      // Refresh logs
      const res = await api.get(`/patient/medications/${medId}/logs`)
      setLogs(prev => ({ ...prev, [medId]: res.data }))
    } catch (e) { alert('Failed to log') }
  }

  const getStreak = (medId) => {
    const medLogs = logs[medId] || []
    let streak = 0
    for (const l of medLogs) {
      if (l.status === 'taken') streak++
      else break
    }
    return streak
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Medications</h1>
            <p className="page-subtitle">Track your medication adherence</p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {meds.map((m) => {
              const streak = getStreak(m.id)
              return (
                <motion.div key={m.id} className="glass-card" style={{ padding: 20 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(162,155,254,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Pill size={20} color="#A29BFE" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{m.name}</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.dosage} · {m.frequency}</p>
                        {m.time_of_day?.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            {m.time_of_day.map(t => (
                              <span key={t} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 500, background: 'var(--bg-primary)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{t}</span>
                            ))}
                          </div>
                        )}
                        {m.instructions && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{m.instructions}</p>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      {/* Streak */}
                      {streak > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,165,2,0.15)', color: '#FFA502', fontSize: 12, fontWeight: 600 }}>
                          <Flame size={14} /> {streak} day streak
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => logMed(m.id, 'taken')} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                          background: 'rgba(46,213,115,0.15)', border: '1px solid rgba(46,213,115,0.3)',
                          color: '#2ED573', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>
                          <Check size={14} /> Taken
                        </button>
                        <button onClick={() => logMed(m.id, 'missed')} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                          background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)',
                          color: '#FF4757', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>
                          <X size={14} /> Missed
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recent logs */}
                  {(logs[m.id] || []).length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
                      {(logs[m.id] || []).slice(0, 14).reverse().map((l, i) => (
                        <div key={i} style={{
                          width: 24, height: 24, borderRadius: 6, fontSize: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: l.status === 'taken' ? 'rgba(46,213,115,0.2)' : 'rgba(255,71,87,0.2)',
                          color: l.status === 'taken' ? '#2ED573' : '#FF4757',
                        }}>
                          {l.status === 'taken' ? '✓' : '✗'}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
            {meds.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active medications</p>}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

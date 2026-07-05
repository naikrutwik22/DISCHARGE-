import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function Analytics() {
  const [doctors, setDoctors] = useState([])
  const [stats, setStats] = useState({})

  useEffect(() => {
    const fetch = async () => {
      try {
        const [d, s] = await Promise.all([api.get('/admin/doctors'), api.get('/admin/stats')])
        setDoctors(d.data); setStats(s.data)
      } catch (e) { console.error(e) }
    }
    fetch()
  }, [])

  const surveyData = [
    { month: 'Jan', completed: 45, pending: 12 }, { month: 'Feb', completed: 52, pending: 8 },
    { month: 'Mar', completed: 61, pending: 15 }, { month: 'Apr', completed: 48, pending: 10 },
    { month: 'May', completed: 70, pending: 6 }, { month: 'Jun', completed: 55, pending: 9 },
  ]

  const riskDist = [
    { name: 'Low', value: 60, color: '#2ED573' },
    { name: 'Medium', value: 25, color: '#FFA502' },
    { name: 'High', value: 15, color: '#FF4757' },
  ]

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Performance metrics and insights</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Survey Completion */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="var(--accent)" /> Survey Completion Rates
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={surveyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
                  <Bar dataKey="completed" fill="#00D4AA" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#FFA502" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Distribution */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Patient Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={riskDist} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {riskDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                {riskDist.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} /> {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Doctor Performance Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Doctor Performance</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Doctor</th><th>Specialization</th><th>Patients</th><th>Surveys Sent</th><th>Avg Response</th></tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.full_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{d.specialization || '—'}</td>
                    <td>{Math.floor(Math.random() * 20) + 5}</td>
                    <td>{Math.floor(Math.random() * 50) + 10}</td>
                    <td style={{ color: 'var(--accent)' }}>{(Math.random() * 2 + 1).toFixed(1)}h</td>
                  </tr>
                ))}
                {doctors.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No doctors</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

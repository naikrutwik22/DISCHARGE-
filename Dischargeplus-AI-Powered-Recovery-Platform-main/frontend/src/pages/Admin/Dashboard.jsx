import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Stethoscope, AlertTriangle, RotateCcw, TrendingUp } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Sidebar from '../../components/shared/Sidebar'
import StatCard from '../../components/shared/StatCard'
import api from '../../lib/api'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats')
        setStats(res.data)
      } catch (e) {
        console.error('Failed to fetch stats:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Placeholder trend data
  const trendData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    readmissions: Math.floor(Math.random() * 5) + 1,
    discharges: Math.floor(Math.random() * 10) + 5,
  }))

  const riskData = [
    { name: 'Low Risk', value: 60, color: '#2ED573' },
    { name: 'Medium', value: 25, color: '#FFA502' },
    { name: 'High Risk', value: 15, color: '#FF4757' },
  ]

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="page-header">
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Overview of your hospital's post-discharge care</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard title="Total Patients" value={stats.total_patients || 0} icon={Users} color="var(--accent)" trend={12} onClick={() => navigate('/admin/patients')} />
            <StatCard title="Total Doctors" value={stats.total_doctors || 0} icon={Stethoscope} color="#00B4D8" onClick={() => navigate('/admin/doctors')} />
            <StatCard title="High Risk" value={stats.high_risk_count || 0} icon={AlertTriangle} color="var(--risk-high)" trend={-5} />
            <StatCard title="Readmissions" value={stats.readmission_count || 0} icon={RotateCcw} color="var(--risk-medium)" />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Readmission Trend */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
                <TrendingUp size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                30-Day Readmission Trend
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }}
                  />
                  <Line type="monotone" dataKey="readmissions" stroke="#FF4757" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="discharges" stroke="#00D4AA" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Pie */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {riskData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                {riskData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

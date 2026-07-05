import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, AlertTriangle, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import RiskBadge from '../../components/shared/RiskBadge'
import RiskPie from '../../components/charts/RiskPie'
import api from '../../lib/api'

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {}
        if (riskFilter) params.risk_filter = riskFilter
        if (search) params.search = search
        const res = await api.get('/doctor/patients', { params })
        setPatients(res.data)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
  }, [riskFilter, search])

  const highRisk = patients.filter(p => p.risk_level === 'high')
  const riskCounts = {
    low: patients.filter(p => p.risk_level === 'low').length,
    medium: patients.filter(p => p.risk_level === 'medium').length,
    high: highRisk.length,
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">My Patients</h1>
            <p className="page-subtitle">{loading ? 'Loading assigned patients...' : `${patients.length} assigned patients`}</p>
          </div>

          {/* High Risk Alert */}
          {!loading && highRisk.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color="#FF4757" />
              <span style={{ fontSize: 14, color: '#FF4757', fontWeight: 500 }}>
                {highRisk.length} patient{highRisk.length > 1 ? 's' : ''} at high risk: {highRisk.map(p => p.full_name).join(', ')}
              </span>
            </motion.div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input-field" style={{ paddingLeft: 40 }} placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={loading} />
            </div>
            <select className="input-field" style={{ width: 180 }} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} disabled={loading}>
              <option value="">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
            {/* Patient List */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Patient</th><th>Diagnosis</th><th>Risk</th><th>Last Survey</th><th>Days Post-DC</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                          <span style={{
                            width: 18,
                            height: 18,
                            border: '2px solid var(--accent)',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            display: 'inline-block'
                          }} />
                          <span style={{ fontWeight: 500 }}>Loading patients...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {patients.map((p) => {
                        const daysSince = p.discharge_date ? Math.floor((Date.now() - new Date(p.discharge_date)) / 86400000) : '—'
                        return (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/doctor/patient/${p.id}`)}>
                            <td style={{ fontWeight: 500 }}>{p.full_name}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{p.diagnosis || '—'}</td>
                            <td><RiskBadge level={p.risk_level || 'low'} size="sm" /></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.last_survey_date ? new Date(p.last_survey_date).toLocaleDateString() : 'Never'}</td>
                            <td>{daysSince}</td>
                          </tr>
                        )
                      })}
                      {patients.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No patients found</td></tr>}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Risk Distribution */}
            <div className="glass-card" style={{ padding: 20, height: 'fit-content' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Risk Distribution</h3>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: 'var(--text-muted)', fontSize: 13 }}>
                  Loading distribution...
                </div>
              ) : (
                <RiskPie data={[
                  { name: 'Low', value: riskCounts.low, color: '#2ED573' },
                  { name: 'Medium', value: riskCounts.medium, color: '#FFA502' },
                  { name: 'High', value: riskCounts.high, color: '#FF4757' },
                ]} />
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

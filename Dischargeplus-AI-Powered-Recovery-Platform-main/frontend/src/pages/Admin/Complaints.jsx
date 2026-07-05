import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X, AlertCircle } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Image Modal
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Status updating
  const [updatingId, setUpdatingId] = useState(null)

  const fetchComplaints = async () => {
    try {
      const { data } = await api.get('/admin/complaints')
      setComplaints(data)
    } catch (e) {
      console.error('Failed to fetch complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      await api.patch(`/admin/complaints/${id}/status?status=${newStatus}`)
      fetchComplaints()
    } catch (e) {
      console.error('Failed to update status', e)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(255,165,2,0.15)', color: '#FFA502' }}>Open</span>
      case 'in_progress':
        return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(0,180,216,0.15)', color: '#00B4D8' }}>In Progress</span>
      case 'resolved':
        return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(0,212,170,0.15)', color: 'var(--accent)' }}>Resolved</span>
      default:
        return null
    }
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Patient Complaints</h1>
            <p className="page-subtitle">Manage and resolve issues raised by patients.</p>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={40} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 500, fontSize: 16 }}>No pending complaints.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Patients have not raised any issues yet.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>PATIENT</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>SUBJECT & COMPLAINT</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>EVIDENCE</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>STATUS</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{c.patient_name || 'Unknown Patient'}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</p>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{c.subject}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 300 }}>{c.description}</p>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {c.image_url ? (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => setSelectedImage(c.image_url)}
                          >
                            <ImageIcon size={14} /> View
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {getStatusBadge(c.status)}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <select 
                          className="input-field"
                          style={{ width: '130px', padding: '6px 10px', fontSize: 12, height: 'auto', opacity: updatingId === c.id ? 0.5 : 1 }}
                          value={c.status}
                          disabled={updatingId === c.id}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Image Modal */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
            >
              <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                <button 
                  onClick={() => setSelectedImage(null)} 
                  style={{ position: 'absolute', top: -40, right: -40, background: 'white', border: 'none', cursor: 'pointer', color: '#000', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={24} />
                </button>
                <img src={selectedImage} alt="Complaint Evidence" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, UploadCloud, AlertCircle } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

export default function PatientComplaint() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchComplaints = async () => {
    try {
      setFetching(true)
      const { data } = await api.get('/patient/complaints')
      setComplaints(data)
    } catch (e) {
      console.error('Failed to fetch complaints')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('subject', subject)
      formData.append('description', description)
      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      await api.post('/patient/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setIsModalOpen(false)
      setSubject('')
      setDescription('')
      setSelectedFile(null)
      fetchComplaints()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit complaint')
    } finally {
      setSubmitLoading(false)
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
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="page-title">My Complaints</h1>
              <p className="page-subtitle">Track and raise issues directly with hospital administration.</p>
            </div>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> New Complaint
            </button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={40} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 500, fontSize: 16 }}>No complaints raised.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Any issues you report will appear here.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>SUBJECT</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>STATUS</th>
                    <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <p style={{ fontWeight: 500, fontSize: 15 }}>{c.subject}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{c.description.substring(0, 60)}{c.description.length > 60 ? '...' : ''}</p>
                      </td>
                      <td style={{ padding: '16px 24px' }}>{getStatusBadge(c.status)}</td>
                      <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* New Complaint Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                style={{ background: 'var(--bg-primary)', padding: 32, borderRadius: 20, width: '100%', maxWidth: 500, border: '1px solid var(--border)', position: 'relative' }}
              >
                <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
                
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Raise a Complaint</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>Describe your issue and attach a screenshot if applicable.</p>

                {error && (
                  <div style={{ background: 'rgba(255,71,87,0.1)', padding: 12, borderRadius: 8, color: '#FF4757', fontSize: 13, marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>SUBJECT</label>
                    <input 
                      type="text" required className="input-field" placeholder="E.g. Issue with prescription"
                      value={subject} onChange={e => setSubject(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>DESCRIPTION</label>
                    <textarea 
                      required className="input-field" rows={4} placeholder="Detailed explanation..."
                      value={description} onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>SCREENSHOT EVIDENCE (Optional)</label>
                    <input 
                      type="file" accept="image/*" className="input-field" 
                      onChange={e => setSelectedFile(e.target.files[0])}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Upload directly from your device.</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="login-link-btn" style={{ background: 'transparent' }}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={submitLoading}>
                      {submitLoading ? 'Submitting...' : 'Submit Complaint'}
                    </button>
                  </div>
                </form>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

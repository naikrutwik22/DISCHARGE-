import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Globe, Loader } from 'lucide-react'
import Tesseract from 'tesseract.js'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'
import useStore from '../../store/useStore'

export default function ReportAnalyzer() {
  const [file, setFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const { language, setLanguage } = useStore()

  const handleFileUpload = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setOcrLoading(true)
    setAnalysis(null)
    try {
      // Client-side OCR with Tesseract.js v7
      const result = await Tesseract.recognize(f, 'eng')
      setOcrText(result.data.text)
    } catch (e) {
      console.error('OCR failed:', e)
      setOcrText('OCR failed. Please paste text manually.')
    } finally {
      setOcrLoading(false)
    }
  }

  const analyzeReport = async (lang = language) => {
    if (!ocrText.trim()) return alert('No text to analyze')
    setLoading(true)
    try {
      const res = await api.post('/ai/analyze-report', { text: ocrText, language: lang })
      setAnalysis(res.data)
    } catch (e) { alert('Analysis failed') }
    finally { setLoading(false) }
  }

  const toggleLanguage = () => {
    const newLang = language === 'english' ? 'hindi' : 'english'
    setLanguage(newLang)
    if (ocrText.trim()) analyzeReport(newLang)
  }

  const statusColor = (status) => ({ normal: '#2ED573', borderline: '#FFA502', abnormal: '#FF4757' }[status] || '#2ED573')

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 className="page-title">Report Analyzer</h1>
              <p className="page-subtitle">Upload medical reports for AI analysis</p>
            </div>
            <button className="btn-secondary" onClick={toggleLanguage} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={16} /> {language === 'english' ? '🇮🇳 Hindi' : '🇬🇧 English'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: analysis ? '1fr 1fr' : '1fr', gap: 20 }}>
            {/* Upload + OCR */}
            <div>
              <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: 40, border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer',
                  transition: 'border-color 0.3s',
                }}>
                  <Upload size={32} color="var(--accent)" />
                  <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>
                    {file ? file.name : 'Drop or click to upload PDF/Image'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Supports PDF, JPG, PNG</p>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              {ocrLoading && (
                <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                  <Loader size={24} color="var(--accent)" className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Extracting text...</p>
                </div>
              )}

              {!ocrLoading && (
                <div className="glass-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color="var(--accent)" /> {ocrText ? 'Extracted Text' : 'Enter Report Text'}
                  </h3>
                  <textarea 
                    className="input-field" 
                    rows={8} 
                    value={ocrText} 
                    onChange={(e) => setOcrText(e.target.value)} 
                    placeholder="Paste or type your medical report text here, or upload a document above..."
                    style={{ fontSize: 12, resize: 'vertical' }} 
                  />
                  <button className="btn-primary" onClick={() => analyzeReport()} disabled={loading || !ocrText.trim()} style={{ width: '100%', marginTop: 12 }}>
                    {loading ? 'Analyzing...' : '🤖 Analyze with AI'}
                  </button>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            {analysis && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* Parameters */}
                <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Parameters</h3>
                  {analysis.parameters?.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ref: {p.reference_range || '—'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{p.value} {p.unit || ''}</span>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: `${statusColor(p.status)}20`, color: statusColor(p.status),
                        }}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>💡 What This Means For You</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{analysis.summary}</p>
                </div>

                {/* Questions */}
                {analysis.questions?.length > 0 && (
                  <div className="glass-card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>❓ Questions to Ask Your Doctor</h3>
                    <ul style={{ paddingLeft: 20 }}>
                      {analysis.questions.map((q, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

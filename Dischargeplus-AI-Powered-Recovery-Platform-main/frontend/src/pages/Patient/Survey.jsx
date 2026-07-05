import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, CheckCircle, Thermometer, Droplets, Heart, Activity, Camera, Mic, FileText } from 'lucide-react'
import Sidebar from '../../components/shared/Sidebar'
import api from '../../lib/api'

const ICONS = { fever: Thermometer, spo2: Droplets, bp: Heart, sugar: Activity, pain: Activity, photo: Camera, voice: Mic, custom_text: FileText }

export default function Survey() {
  const [searchParams] = useSearchParams()
  const surveyId = searchParams.get('id')
  const [surveys, setSurveys] = useState([])
  const [activeSurvey, setActiveSurvey] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)

  useEffect(() => {
    api.get('/patient/surveys/pending').then(res => {
      setSurveys(res.data)
      if (surveyId) {
        const s = res.data.find(s => s.id === surveyId)
        if (s) setActiveSurvey(s)
      }
    }).catch(() => {})
  }, [surveyId])

  const setAnswer = (type, field, value) => {
    setAnswers(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  const handleSubmit = async () => {
    if (!activeSurvey) return
    setSubmitting(true)
    try {
      const answerList = activeSurvey.question_types.map(type => ({
        question_type: type,
        answer_value: answers[type]?.answer_value || null,
        answer_numeric: answers[type]?.answer_numeric || null,
        file_url: answers[type]?.file_url || null,
      }))
      const res = await api.post(`/surveys/${activeSurvey.id}/respond`, { answers: answerList })
      setFeedback(res.data)
    } catch (e) { alert(e.response?.data?.detail || 'Failed') }
    finally { setSubmitting(false) }
  }

  const renderInput = (type) => {
    const Icon = ICONS[type] || Activity
    switch (type) {
      case 'fever':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Temperature (°F)</label>
            <input className="input-field" type="number" step="0.1" placeholder="98.6" onChange={(e) => setAnswer(type, 'answer_numeric', parseFloat(e.target.value))} />
          </div>
        )
      case 'spo2':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> SpO2 (%)</label>
            <input className="input-field" type="number" min="0" max="100" placeholder="98" onChange={(e) => setAnswer(type, 'answer_numeric', parseFloat(e.target.value))} />
          </div>
        )
      case 'bp':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Blood Pressure</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input-field" type="number" placeholder="Systolic (120)" onChange={(e) => setAnswer(type, 'answer_numeric', parseFloat(e.target.value))} />
              <input className="input-field" type="number" placeholder="Diastolic (80)" onChange={(e) => setAnswer(type, 'answer_value', e.target.value)} />
            </div>
          </div>
        )
      case 'sugar':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Blood Sugar (mg/dL)</label>
            <input className="input-field" type="number" placeholder="110" onChange={(e) => setAnswer(type, 'answer_numeric', parseFloat(e.target.value))} />
          </div>
        )
      case 'pain':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Pain Level: {answers[type]?.answer_numeric || 0}/10</label>
            <input type="range" min="0" max="10" value={answers[type]?.answer_numeric || 0} onChange={(e) => setAnswer(type, 'answer_numeric', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
              <span>No pain</span><span>Worst pain</span>
            </div>
          </div>
        )

      case 'photo':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Photo / Video Upload</label>
            {!answers[type]?.file_url ? (
              <input type="file" accept="image/*,video/*" capture="environment" className="input-field" onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const img = new Image()
                      img.onload = () => {
                        const canvas = document.createElement('canvas')
                        const MAX_WIDTH = 800
                        let width = img.width
                        let height = img.height
                        if (width > MAX_WIDTH) {
                          height = Math.round((height * MAX_WIDTH) / width)
                          width = MAX_WIDTH
                        }
                        canvas.width = width
                        canvas.height = height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0, width, height)
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7)
                        setAnswer(type, 'file_url', compressedDataUrl)
                        setAnswer(type, 'answer_value', file.name)
                      }
                      img.src = event.target.result
                    }
                    reader.readAsDataURL(file)
                  } else {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setAnswer(type, 'file_url', reader.result)
                      setAnswer(type, 'answer_value', file.name)
                    }
                    reader.readAsDataURL(file)
                  }
                }
              }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {answers[type].file_url.startsWith('data:video/') ? (
                  <video src={answers[type].file_url} controls style={{ width: '100%', borderRadius: 8, maxHeight: 200, background: '#000' }} />
                ) : (
                  <img src={answers[type].file_url} alt="Preview" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{answers[type].answer_value}</span>
                  <button type="button" className="btn-secondary" onClick={() => { setAnswer(type, 'file_url', null); setAnswer(type, 'answer_value', null); }}>Remove</button>
                </div>
              </div>
            )}
          </div>
        )
      case 'voice':
        const startRecording = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            const chunks = []
            recorder.ondataavailable = e => chunks.push(e.data)
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'audio/webm' })
              const reader = new FileReader()
              reader.onloadend = () => {
                setAnswer(type, 'file_url', reader.result)
                setAnswer(type, 'answer_value', 'Voice Note Recorded')
              }
              reader.readAsDataURL(blob)
            }
            recorder.start()
            setMediaRecorder(recorder)
            setRecording(true)
          } catch (err) { alert('Microphone access denied') }
        }
        const stopRecording = () => {
          mediaRecorder?.stop()
          setRecording(false)
          mediaRecorder?.stream.getTracks().forEach(t => t.stop())
        }
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Voice Note</label>
            {!answers[type]?.file_url ? (
              <button type="button" className="btn-secondary" style={{ width: '100%', background: recording ? '#FF4757' : '', color: recording ? 'white' : '' }} onClick={recording ? stopRecording : startRecording}>
                {recording ? '⏹ Stop Recording' : '🎙 Record Voice Note'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <audio src={answers[type].file_url} controls style={{ flex: 1, height: 40 }} />
                <button type="button" className="btn-secondary" onClick={() => setAnswer(type, 'file_url', null)}>Reset</button>
              </div>
            )}
          </div>
        )
      case 'custom_text':
        return (
          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} /> Your Symptoms</label>
            <textarea className="input-field" rows={3} placeholder="Describe how you feel..." onChange={(e) => setAnswer(type, 'answer_value', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        )
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
            <h1 className="page-title">Health Survey</h1>
            <p className="page-subtitle">{activeSurvey ? activeSurvey.title : 'Select a survey to complete'}</p>
          </div>

          {feedback ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ padding: 32, maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
              <CheckCircle size={48} color="var(--accent)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Survey Submitted!</h2>
              {feedback.ai_feedback && (
                <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 20, marginTop: 16, textAlign: 'left', lineHeight: 1.7 }}>
                  <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>💬 AI Health Feedback</p>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{feedback.ai_feedback}</p>
                </div>
              )}
              {feedback.risk_score && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Risk Assessment: </span>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: feedback.risk_score.risk_level === 'high' ? 'rgba(255,71,87,0.15)' : feedback.risk_score.risk_level === 'medium' ? 'rgba(255,165,2,0.15)' : 'rgba(46,213,115,0.15)', color: feedback.risk_score.risk_level === 'high' ? '#FF4757' : feedback.risk_score.risk_level === 'medium' ? '#FFA502' : '#2ED573' }}>
                    {feedback.risk_score.risk_level?.toUpperCase()}
                  </span>
                </div>
              )}
              <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => { setFeedback(null); setActiveSurvey(null); setAnswers({}) }}>Done</button>
            </motion.div>
          ) : activeSurvey ? (
            <div className="glass-card" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
              <div style={{ display: 'grid', gap: 20 }}>
                {activeSurvey.question_types?.map(type => (
                  <div key={type}>{renderInput(type)}</div>
                ))}
              </div>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Survey'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {surveys.map(s => (
                <div key={s.id} className="glass-card glass-card-hover" style={{ padding: 20, cursor: 'pointer' }} onClick={() => setActiveSurvey(s)}>
                  <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.question_types?.length || 0} questions</p>
                </div>
              ))}
              {surveys.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No pending surveys</p>}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

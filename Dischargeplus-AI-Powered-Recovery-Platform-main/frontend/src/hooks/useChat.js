import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

export function useChat(patientId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    if (!patientId) return
    try {
      const res = await api.get(`/chat/${patientId}/history`)
      setMessages(res.data.messages || [])
    } catch (e) { console.error('Failed to fetch chat:', e) }
    finally { setLoading(false) }
  }, [patientId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!patientId) return

    const channel = supabase
      .channel(`chat-${patientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `patient_id=eq.${patientId}`,
      }, (payload) => {
        setMessages(prev => [...prev, {
          ...payload.new,
          sender_name: '',
        }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [patientId])

  const sendMessage = async (message, fileUrl = null, fileType = null) => {
    try {
      await api.post(`/chat/${patientId}/message`, { message, file_url: fileUrl, file_type: fileType })
    } catch (e) { console.error('Failed to send:', e); throw e }
  }

  const markRead = async () => {
    try { await api.post(`/chat/${patientId}/mark-read`) } catch {}
  }

  return { messages, loading, sendMessage, markRead, refetch: fetchHistory }
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, filter = {}) {
  const [data, setData] = useState([])

  useEffect(() => {
    const filterStr = Object.entries(filter).map(([k, v]) => `${k}=eq.${v}`).join(',')
    const channelName = `${table}-${filterStr || 'all'}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        ...(Object.keys(filter).length > 0 && { filter: filterStr }),
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setData(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setData(prev => prev.map(item => item.id === payload.new.id ? payload.new : item))
        } else if (payload.eventType === 'DELETE') {
          setData(prev => prev.filter(item => item.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, JSON.stringify(filter)])

  return { data, setData }
}

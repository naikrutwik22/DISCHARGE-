import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import useStore from '../store/useStore'

export function useAuth() {
  const navigate = useNavigate()
  const { setUser, logout: storeLogout } = useStore()

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, refresh_token, user } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(user)
    redirectByRole(user.role)
    return user
  }

  const adminRegister = async (data) => {
    const res = await api.post('/auth/admin-register', data)
    const { access_token, refresh_token, user } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(user)
    navigate('/admin/dashboard')
    return user
  }

  const logout = async () => {
    try { await supabase.auth.signOut() } catch {}
    storeLogout()
    navigate('/login')
  }

  const restoreSession = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user) setUser(user)
    return user
  }

  const redirectByRole = (role) => {
    switch (role) {
      case 'admin': navigate('/admin/dashboard'); break
      case 'doctor': navigate('/doctor/dashboard'); break
      case 'patient': navigate('/patient/dashboard'); break
      default: navigate('/login')
    }
  }

  return { login, adminRegister, logout, restoreSession, redirectByRole }
}

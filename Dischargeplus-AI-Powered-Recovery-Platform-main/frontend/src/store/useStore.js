import { create } from 'zustand'

const useStore = create((set, get) => ({
  // Auth
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false, notifications: [] })
  },

  // Notifications
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.is_read).length
    set({ notifications, unreadCount })
  },

  addNotification: (notification) => {
    const current = get().notifications
    set({
      notifications: [notification, ...current],
      unreadCount: get().unreadCount + 1,
    })
  },

  // Language preference
  language: localStorage.getItem('language') || 'english',
  setLanguage: (language) => {
    localStorage.setItem('language', language)
    set({ language })
  },

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

export default useStore

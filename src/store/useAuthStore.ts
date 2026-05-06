import { create } from 'zustand'
const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3005'
  : `http://${window.location.hostname}:3005`

export interface AuthUser {
  id: string; username: string; name: string
  role: 'Admin' | 'Deputy' | 'Manager' | 'Viewer'; password: string
}

interface AuthState {
  currentUser: Omit<AuthUser,'password'> | null
  login: (username: string, password: string) => Promise<boolean | 'network'>
  signup: (data: Omit<AuthUser,'id'>) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,

  login: async (username, password) => {
    try {
      const res = await fetch(`${BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) return false
      const data = await res.json()
      if (!data.ok) return false
      set({ currentUser: data.user })
      return true
    } catch {
      return 'network'
    }
  },

  signup: async ({ username, name, role, password }) => {
    if (!username.trim() || !name.trim() || !password.trim())
      return { ok: false, error: 'جميع الحقول مطلوبة' }
    if (password.length < 6)
      return { ok: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }
    try {
      const res = await fetch(`${BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, role, password })
      })
      const data = await res.json()
      if (!data.ok) return { ok: false, error: data.error || 'فشل التسجيل' }
      return { ok: true }
    } catch {
      return { ok: false, error: 'تعذّر الاتصال بالسيرفر' }
    }
  },

  logout: () => set({ currentUser: null }),
}))
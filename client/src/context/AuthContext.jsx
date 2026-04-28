import { createContext, useContext, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const STORAGE_KEY = 'stm-auth'

const AuthContext = createContext(null)

function loadStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : { user: null, token: null }
  } catch {
    return { user: null, token: null }
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth)

  function storeAuth(user, token) {
    const value = { user, token }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    setAuth(value)
  }

  async function login(email, password) {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed.')
    storeAuth(data.data.user, data.data.token)
    return data.data.user
  }

  async function register(name, email, password) {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed.')
    storeAuth(data.data.user, data.data.token)
    return data.data.user
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setAuth({ user: null, token: null })
  }

  return (
    <AuthContext.Provider value={{
      user: auth.user,
      token: auth.token,
      isAuthenticated: !!auth.token,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

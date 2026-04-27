import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const name  = localStorage.getItem('admin_name')
    if (token) setAdmin({ token, name })
    setLoading(false)
  }, [])

  async function login(email, password) {
    const { data } = await apiLogin(email, password)
    localStorage.setItem('admin_token', data.access_token)
    localStorage.setItem('admin_name',  data.name)
    setAdmin({ token: data.access_token, name: data.name })
  }

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_name')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

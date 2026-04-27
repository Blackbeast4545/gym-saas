import { createContext, useContext, useState, useEffect } from 'react'
import { gymLogin } from '../services/api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('gym_token')
    const name  = localStorage.getItem('gym_name')
    const role  = localStorage.getItem('gym_role')
    const gymId = localStorage.getItem('gym_id')
    const gymName = localStorage.getItem('gym_display_name')
    if (token) setUser({ token, name, role, gymId, gymName })
    setLoad(false)
  }, [])

  async function login(phone, password, gymId) {
    const { data } = await gymLogin(phone, password, gymId)
    localStorage.setItem('gym_token', data.access_token)
    localStorage.setItem('gym_name',  data.name)
    localStorage.setItem('gym_role',  data.role)
    localStorage.setItem('gym_id',    gymId)
    setUser({ token: data.access_token, name: data.name, role: data.role, gymId })
  }

  function logout() {
    localStorage.clear()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

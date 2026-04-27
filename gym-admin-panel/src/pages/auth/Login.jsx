import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Login() {
  const [gymId,    setGymId]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (phone.length < 10) return toast.error('Enter valid 10-digit phone number')
    setLoading(true)
    try {
      await login(phone, password, gymId)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail
      toast.error(msg || 'Invalid credentials. Check phone, password and Gym ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-emerald-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FitNexus</h1>
            <p className="text-xs text-gray-500">Gym Admin Panel</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
        <p className="text-gray-500 text-sm mb-6">Sign in to manage your gym</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Gym ID</label>
            <input className="input" value={gymId} onChange={e => setGymId(e.target.value)}
              placeholder="Provided by FitNexus admin" required/>
            <p className="text-xs text-gray-400 mt-1">Get this from your FitNexus subscription email</p>
          </div>
          <div>
            <label className="label">Mobile Number</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="10-digit mobile number" maxLength={10} required/>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required/>
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full py-2.5 mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact FitNexus support if you forgot your credentials
        </p>
      </div>
    </div>
  )
}

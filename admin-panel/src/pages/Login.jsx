import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-purple-700">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FitNexus</h1>
            <p className="text-xs text-gray-500">Super Admin Panel</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
        <p className="text-gray-500 text-sm mb-6">Sign in to your admin account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="admin@yourdomain.com" required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="••••••••" required
            />
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full py-2.5 mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: BASE_URL })

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/super-admin/login', { email, password })

// ── Dashboard ─────────────────────────────────────────────────────
export const getDashboard = () => api.get('/super-admin/dashboard')
export const getRevenue   = () => api.get('/super-admin/revenue')

// ── Gyms ──────────────────────────────────────────────────────────
export const getGyms      = (params) => api.get('/super-admin/gyms', { params })
export const getGym       = (id)     => api.get(`/super-admin/gyms/${id}`)
export const createGym    = (data)   => api.post('/super-admin/gyms', data)
export const updateGym    = (id, d)  => api.put(`/super-admin/gyms/${id}`, d)
export const toggleAccess = (id)     => api.patch(`/super-admin/gyms/${id}/toggle-access`)

// ── Subscriptions ─────────────────────────────────────────────────
export const updateSubscription = (gymId, data) =>
  api.put(`/super-admin/gyms/${gymId}/subscription`, data)

export default api

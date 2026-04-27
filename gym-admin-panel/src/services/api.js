import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('gym_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    // Demo mode — show friendly toast instead of error
    if (err.response?.status === 403 && err.response?.data?.demo_mode) {
      const toast = window.__demoToast
      if (toast) {
        toast(err.response.data.detail, { icon: '🔒', duration: 4000 })
      } else {
        alert(err.response.data.detail)
      }
      return new Promise(() => {}) // swallow the error, don't propagate
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────
export const gymLogin = (phone, password, gym_id) =>
  api.post('/auth/gym/login', { phone, password, gym_id })

// ── Dashboard ─────────────────────────────────────────────────────
export const getDashboard = () => api.get('/gym/dashboard')

// ── Gym Settings ──────────────────────────────────────────────────
export const getGymSettings  = ()     => api.get('/gym/settings')
export const updateGymSettings = (d)  => api.put('/gym/settings', d)

// ── Feature Flags ─────────────────────────────────────────────────
export const getFeatures     = ()     => api.get('/gym/features')

// ── Members ───────────────────────────────────────────────────────
export const getMembers      = (params) => api.get('/gym/members', { params })
export const getMember       = (id)     => api.get(`/gym/members/${id}`)
export const createMember    = (data)   => api.post('/gym/members', data)
export const updateMember    = (id, d)  => api.put(`/gym/members/${id}`, d)
export const deactivateMember= (id)     => api.delete(`/gym/members/${id}`)

// ── Membership Plans ──────────────────────────────────────────────
export const getPlans    = ()        => api.get('/gym/membership-plans')
export const createPlan  = (data)    => api.post('/gym/membership-plans', data)
export const updatePlan  = (id, d)   => api.put(`/gym/membership-plans/${id}`, d)
export const deletePlan  = (id)      => api.delete(`/gym/membership-plans/${id}`)

// ── Payments ──────────────────────────────────────────────────────
export const getPayments    = (params) => api.get('/gym/payments', { params })
export const recordPayment  = (data)   => api.post('/gym/payments', data)
export const updatePayment  = (id, d)  => api.put(`/gym/payments/${id}`, d)
export const deletePayment  = (id)     => api.delete(`/gym/payments/${id}`)
export const getReceipt     = (id)     => api.get(`/gym/payments/${id}/receipt`, { responseType: 'blob' })

// ── Attendance ────────────────────────────────────────────────────
export const getTodayAttendance  = ()       => api.get('/attendance/today')
export const getAttendanceHistory = (p)     => api.get('/attendance/history', { params: p })
export const getMemberAttendance = (id, p)  => api.get(`/attendance/member/${id}/history`, { params: p })
export const manualCheckin       = (mid)    => api.post('/attendance/manual', { member_id: mid })
export const deleteAttendance    = (id)     => api.delete(`/attendance/${id}`)
export const getQRToken          = ()       => api.get('/attendance/qr-token')
export const getQRImage          = ()       => api.get('/attendance/qr-code', { responseType: 'blob' })

// ── Workout Plans ─────────────────────────────────────────────────
export const getWorkoutPlans   = ()        => api.get('/gym/workout-plans')
export const createWorkoutPlan = (data)    => api.post('/gym/workout-plans', data)
export const updateWorkoutPlan = (id, d)   => api.put(`/gym/workout-plans/${id}`, d)
export const deleteWorkoutPlan = (id)      => api.delete(`/gym/workout-plans/${id}`)
export const assignWorkout     = (data)    => api.post('/gym/workout-plans/assign', data)

// ── Diet Plans ────────────────────────────────────────────────────
export const getAllDietPlans = ()        => api.get('/gym/diet-plans')
export const getMemberDiet   = (mid)    => api.get(`/gym/diet-plans/${mid}`)
export const createDiet      = (data)   => api.post('/gym/diet-plans', data)
export const updateDiet      = (id, d)  => api.put(`/gym/diet-plans/${id}`, d)
export const deleteDiet      = (id)     => api.delete(`/gym/diet-plans/${id}`)

// ── Workout Plan Members ──────────────────────────────────────────
export const getWorkoutPlanMembers = (id) => api.get(`/gym/workout-plans/${id}/members`)
export const unassignWorkout       = (mid) => api.delete(`/gym/workout-plans/unassign/${mid}`)

// ── Body Measurements ─────────────────────────────────────────────
export const recordMeasurement     = (data)    => api.post('/gym/body-measurements', data)
export const getMemberMeasurements = (mid)     => api.get(`/gym/body-measurements/${mid}`)
export const updateMeasurement     = (id, d)   => api.put(`/gym/body-measurements/${id}`, d)
export const deleteMeasurement     = (id)      => api.delete(`/gym/body-measurements/${id}`)

// ── Staff ─────────────────────────────────────────────────────────
export const getStaff    = ()       => api.get('/gym/staff')
export const createStaff = (data)   => api.post('/gym/staff', data)
export const updateStaff = (id, d)  => api.put(`/gym/staff/${id}`, d)
export const removeStaff = (id)     => api.delete(`/gym/staff/${id}`)

// ── Notifications ─────────────────────────────────────────────────
export const sendBulk = (data) => api.post('/notifications/bulk', data)

export default api

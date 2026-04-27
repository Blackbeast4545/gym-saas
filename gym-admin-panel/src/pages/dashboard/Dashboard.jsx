import { useEffect, useState } from 'react'
import { getDashboard, getTodayAttendance } from '../../services/api'
import { Users, Receipt, UserCheck, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { StatCard, Spinner } from '../../components/UI'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

export default function Dashboard() {
  const [dash, setDash]       = useState(null)
  const [today, setToday]     = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    Promise.all([getDashboard(), getTodayAttendance()])
      .then(([d, t]) => { setDash(d.data); setToday(t.data) })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner/>

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={dash?.total_active_members ?? 0}
          icon={<Users className="w-5 h-5"/>}/>
        <StatCard label="Today's Check-ins" value={today?.total ?? 0}
          color="text-blue-600" icon={<UserCheck className="w-5 h-5"/>}/>
        <StatCard label="Monthly Revenue" value={`₹${((dash?.monthly_revenue ?? 0)/1000).toFixed(1)}K`}
          color="text-emerald-600" icon={<TrendingUp className="w-5 h-5"/>}/>
        <StatCard label="Expired Plans" value={dash?.expired_memberships ?? 0}
          color="text-red-500" icon={<AlertTriangle className="w-5 h-5"/>}/>
      </div>

      {/* Alerts */}
      {(dash?.expiring_in_7_days > 0 || dash?.expired_memberships > 0) && (
        <div className="space-y-2">
          {dash?.expiring_in_7_days > 0 && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
              <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0"/>
              <span className="text-yellow-800">
                <strong>{dash.expiring_in_7_days} members</strong> have plans expiring in the next 7 days.
                <a href="/members?filter=expiring" className="ml-1 underline">View them →</a>
              </span>
            </div>
          )}
          {dash?.expired_memberships > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0"/>
              <span className="text-red-800">
                <strong>{dash.expired_memberships} members</strong> have expired plans and need renewal.
                <a href="/members?filter=expired" className="ml-1 underline">View them →</a>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Today's attendance */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Today's Check-ins</h2>
          <span className="text-sm text-gray-500">{format(new Date(), 'dd MMM yyyy')}</span>
        </div>
        {(!today?.logs || today.logs.length === 0) ? (
          <div className="py-10 text-center text-gray-400 text-sm">No check-ins yet today</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Member</th>
                <th className="th">Phone</th>
                <th className="th">Time</th>
                <th className="th">Method</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {today.logs.slice(0, 10).map(log => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {log.profile_photo_url ? (
                          <img src={log.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"/>
                        ) : (
                          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                            {log.member_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{log.member_name}</span>
                      </div>
                    </td>
                    <td className="td text-gray-500">{log.member_phone}</td>
                    <td className="td">{format(new Date(log.checked_in_at), 'hh:mm a')}</td>
                    <td className="td">
                      <span className={log.method === 'qr_scan' ? 'badge-active' : 'badge-info'}>
                        {log.method === 'qr_scan' ? 'QR Scan' : 'Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {today.logs.length > 10 && (
              <div className="px-4 py-3 text-center text-sm text-gray-400">
                +{today.logs.length - 10} more check-ins today
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getDashboard, getRevenue } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Building2, Users, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick}
      className={`card flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]   = useState(null)
  const [rev, setRev]     = useState(null)
  const [loading, setL]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getDashboard(), getRevenue()])
      .then(([d, r]) => { setData(d.data); setRev(r.data) })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setL(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const chartData = rev ? Object.entries(rev.by_plan).map(([plan, v]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    revenue: Math.round(v.total),
    gyms: v.count,
  })) : []

  const COLORS = ['#4F46E5', '#7C3AED', '#A855F7']

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Gyms" value={data?.total_gyms ?? 0}
          sub={`${data?.active_gyms ?? 0} active`}
          color="bg-primary/10 text-primary"
          onClick={() => navigate('/gyms')} />
        <StatCard icon={Users} label="Total Members" value={data?.total_members_across_platform ?? 0}
          sub="Across all gyms"
          color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={`₹${((data?.total_revenue ?? 0)/1000).toFixed(1)}K`}
          sub="All time"
          color="bg-amber-100 text-amberald-600" />
        <StatCard icon={AlertTriangle} label="Expired Subs" value={data?.expired_subscriptions ?? 0}
          sub="Need renewal"
          color="bg-red-100 text-red-600"
          onClick={() => navigate('/gyms?filter=expired')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by plan */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by plan</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gym breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Gym status</h2>
          <div className="space-y-3 mt-2">
            {[
              { label: 'Active gyms',   value: data?.active_gyms ?? 0,        color: 'bg-emerald-500', max: data?.total_gyms || 1 },
              { label: 'Inactive gyms', value: data?.inactive_gyms ?? 0,       color: 'bg-gray-300',    max: data?.total_gyms || 1 },
              { label: 'Expired subs',  value: data?.expired_subscriptions ?? 0, color: 'bg-red-400',   max: data?.total_gyms || 1 },
            ].map(({ label, value, color, max }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${Math.round((value / max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

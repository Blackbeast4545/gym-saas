import { useEffect, useState } from 'react'
import { getRevenue } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#4F46E5', '#7C3AED', '#A855F7']

export default function Revenue() {
  const [data, setData] = useState(null)
  const [loading, setL] = useState(true)

  useEffect(() => {
    getRevenue()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load revenue'))
      .finally(() => setL(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const barData = data ? Object.entries(data.by_plan).map(([plan, v]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    revenue: Math.round(v.total),
    gyms: v.count,
  })) : []

  const pieData = barData.filter(d => d.gyms > 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500">All-time SaaS revenue breakdown</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue',  value: data?.total_revenue,  color: 'text-primary' },
          { label: 'Active Revenue', value: data?.active_revenue, color: 'text-emerald-600' },
          { label: 'Expired Revenue',value: data?.expired_revenue,color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>
              ₹{((value || 0)/1000).toFixed(1)}K
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ₹{(value || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by plan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={48}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Gyms by plan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="gyms" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} label={({ name, gyms }) => `${name}: ${gyms}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan breakdown table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Plan breakdown</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Plan','Gyms','Total Revenue','Avg per Gym'].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data && Object.entries(data.by_plan).map(([plan, v]) => (
              <tr key={plan}>
                <td className="table-td capitalize font-medium text-primary">{plan}</td>
                <td className="table-td">{v.count}</td>
                <td className="table-td font-medium">₹{Math.round(v.total).toLocaleString()}</td>
                <td className="table-td text-gray-500">
                  {v.count > 0 ? `₹${Math.round(v.total / v.count).toLocaleString()}` : '—'}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="table-td">Total</td>
              <td className="table-td">{data?.total_subscriptions}</td>
              <td className="table-td text-primary">₹{Math.round(data?.total_revenue || 0).toLocaleString()}</td>
              <td className="table-td">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

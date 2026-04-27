import { useEffect, useState } from 'react'
import { getGyms, updateSubscription, toggleAccess } from '../services/api'
import { format, parseISO, differenceInDays } from 'date-fns'
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PLANS = ['basic', 'pro', 'premium']
const PLAN_PRICE = { basic: 999, pro: 1499, premium: 1999 }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const [gyms, setGyms]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [showRenew, setRenew]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [renewForm, setForm]    = useState({
    plan: 'basic', price_paid: 999,
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '', notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getGyms()
      setGyms(data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = gyms.filter(g => {
    if (filter === 'active')  return !g.subscription?.is_expired && g.is_active
    if (filter === 'expired') return g.subscription?.is_expired
    if (filter === 'expiring') {
      const days = g.subscription?.expiry_date
        ? differenceInDays(parseISO(g.subscription.expiry_date), new Date()) : 999
      return days >= 0 && days <= 7
    }
    return true
  })

  async function handleRenew(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSubscription(showRenew.id, renewForm)
      toast.success('Subscription renewed!')
      setRenew(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const fmtDate = s => { try { return format(parseISO(s), 'dd MMM yyyy') } catch { return '—' } }

  const counts = {
    all: gyms.length,
    active: gyms.filter(g => !g.subscription?.is_expired && g.is_active).length,
    expired: gyms.filter(g => g.subscription?.is_expired).length,
    expiring: gyms.filter(g => {
      const d = g.subscription?.expiry_date
        ? differenceInDays(parseISO(g.subscription.expiry_date), new Date()) : 999
      return d >= 0 && d <= 7
    }).length,
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500">Manage all gym subscription plans</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'all',      label: 'All',            icon: null },
          { key: 'active',   label: 'Active',         icon: CheckCircle  },
          { key: 'expiring', label: 'Expiring (7d)',  icon: AlertTriangle },
          { key: 'expired',  label: 'Expired',        icon: XCircle      },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              ${filter === key
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full
              ${filter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Gym', 'Plan', 'Start', 'Expiry', 'Days Left', 'Status', 'Action'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No records found</td></tr>
              ) : filtered.map(gym => {
                const sub = gym.subscription
                const daysLeft = sub?.expiry_date
                  ? differenceInDays(parseISO(sub.expiry_date), new Date()) : null

                return (
                  <tr key={gym.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium">{gym.name}</div>
                      <div className="text-xs text-gray-400">{gym.phone}</div>
                    </td>
                    <td className="table-td">
                      <span className="capitalize font-medium text-primary">{sub?.plan ?? '—'}</span>
                      <div className="text-xs text-gray-400">₹{sub?.price_paid ?? '—'}</div>
                    </td>
                    <td className="table-td text-gray-500 text-sm">{fmtDate(sub?.start_date)}</td>
                    <td className="table-td text-sm">
                      <span className={sub?.is_expired ? 'text-red-600 font-medium' : ''}>
                        {fmtDate(sub?.expiry_date)}
                      </span>
                    </td>
                    <td className="table-td">
                      {daysLeft === null ? '—'
                        : daysLeft < 0
                          ? <span className="text-red-600 font-medium">Expired {Math.abs(daysLeft)}d ago</span>
                          : daysLeft <= 7
                            ? <span className="text-orange-500 font-medium">{daysLeft}d</span>
                            : <span className="text-gray-700">{daysLeft}d</span>
                      }
                    </td>
                    <td className="table-td">
                      {sub?.is_expired
                        ? <span className="badge-expired">Expired</span>
                        : gym.is_active
                          ? <span className="badge-active">Active</span>
                          : <span className="badge-inactive">Disabled</span>
                      }
                    </td>
                    <td className="table-td">
                      <button onClick={() => {
                        setForm({
                          plan: sub?.plan || 'basic',
                          price_paid: PLAN_PRICE[sub?.plan || 'basic'],
                          start_date: new Date().toISOString().split('T')[0],
                          expiry_date: '', notes: '',
                        })
                        setRenew(gym)
                      }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                        <RefreshCw className="w-3 h-3" /> Renew
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Modal */}
      {showRenew && (
        <Modal title={`Renew — ${showRenew.name}`} onClose={() => setRenew(null)}>
          <form onSubmit={handleRenew} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Plan</label>
                <select className="input" value={renewForm.plan}
                  onChange={e => setForm({...renewForm, plan: e.target.value,
                    price_paid: PLAN_PRICE[e.target.value]})}>
                  {PLANS.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input className="input" type="number" value={renewForm.price_paid}
                  onChange={e => setForm({...renewForm, price_paid: Number(e.target.value)})} />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input className="input" type="date" required value={renewForm.start_date}
                  onChange={e => setForm({...renewForm, start_date: e.target.value})} />
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input className="input" type="date" required value={renewForm.expiry_date}
                  onChange={e => setForm({...renewForm, expiry_date: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={renewForm.notes} placeholder="Optional remarks"
                onChange={e => setForm({...renewForm, notes: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRenew(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Renew Subscription'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

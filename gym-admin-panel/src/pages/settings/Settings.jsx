import { useEffect, useState } from 'react'
import { getGymSettings, updateGymSettings } from '../../services/api'
import { Save, Building2, CreditCard, QrCode, Copy } from 'lucide-react'
import { Field, Spinner, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

export default function Settings() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', email: '', logo_url: '' })
  const { user } = useAuth()

  const isOwner = user?.role === 'owner'

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: d } = await getGymSettings()
      setData(d)
      setForm({
        name: d.name || '',
        address: d.address || '',
        email: d.email || '',
        logo_url: d.logo_url || '',
      })
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load settings'
      console.error('Settings load error:', err.response?.status, err.response?.data || err.message)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only load if user is an owner — receptionists don't need this API call
    if (isOwner) {
      load()
    } else {
      setLoading(false)
    }
  }, [isOwner])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: d } = await updateGymSettings(form)
      setData(d)
      toast.success('Settings updated!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update settings'
      console.error('Settings save error:', err.response?.status, err.response?.data || err.message)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function copyToClipboard(text) {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  function formatPlan(plan) {
    if (!plan) return null
    return plan.charAt(0).toUpperCase() + plan.slice(1)
  }

  function formatDate(d) {
    if (!d) return null
    try {
      // Handle both "YYYY-MM-DD" strings and Date objects
      const dateObj = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
      return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return String(d)
    }
  }

  // Non-owners see access denied
  if (!isOwner) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">Owner access only</p>
          <p className="text-sm mt-1">Settings are restricted to gym owners</p>
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  // Show error state with retry button
  if (error && !data) {
    return (
      <div className="p-6 max-w-3xl">
        <PageHeader title="Gym Settings" sub="Manage your gym profile and preferences" />
        <div className="card p-8 text-center">
          <p className="text-red-500 font-medium mb-2">Failed to load settings</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={load} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Gym Settings" sub="Manage your gym profile and preferences" />

      {/* Gym Profile Card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Gym Profile</h3>
            <p className="text-xs text-gray-400">Update your gym's display information</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Gym Name">
              <input className="input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your Gym Name" />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="gym@example.com" />
            </Field>
          </div>
          <Field label="Address">
            <input className="input" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Full gym address" />
          </Field>
          <Field label="Logo URL">
            <input className="input" value={form.logo_url}
              onChange={e => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png" />
            <p className="text-xs text-gray-400 mt-1">
              Enter a direct URL to your gym's logo image. This will appear on receipts and in the member app.
            </p>
          </Field>

          {form.logo_url && (
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <img src={form.logo_url} alt="Logo preview"
                className="w-16 h-16 object-contain rounded-lg border border-gray-200 bg-white"
                onError={e => { e.target.style.display = 'none' }} />
              <span className="text-xs text-gray-500">Logo preview</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription Info */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Subscription</h3>
            <p className="text-xs text-gray-400">Your current FitNexus subscription</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            ['Owner', data?.owner_name],
            ['Phone', data?.phone],
            ['Plan', formatPlan(data?.subscription_plan)],
            ['Expiry', formatDate(data?.subscription_expiry)],
            ['Status', data?.is_active ? 'Active' : 'Disabled'],
          ].filter(([, v]) => v != null && v !== '').map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-gray-50 text-sm">
              <span className="text-gray-500">{k}</span>
              <span className={`font-medium ${k === 'Status' ? (v === 'Active' ? 'text-emerald-600' : 'text-red-500') : ''}`}>
                {v}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Contact FitNexus support to upgrade or renew your subscription.
        </p>
      </div>

      {/* Gym ID & QR Token */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <QrCode className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Technical Details</h3>
            <p className="text-xs text-gray-400">Your gym identifiers for integration</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Gym ID</p>
              <p className="text-xs font-mono text-gray-700 break-all">{data?.id || '—'}</p>
            </div>
            <button onClick={() => copyToClipboard(data?.id)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">QR Token</p>
              <p className="text-xs font-mono text-gray-700 break-all">{data?.qr_token || '—'}</p>
            </div>
            <button onClick={() => copyToClipboard(data?.qr_token)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

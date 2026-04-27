import { useEffect, useState } from 'react'
import { getTodayAttendance, manualCheckin, getMembers } from '../../services/api'
import { UserCheck, RefreshCw, PlusCircle } from 'lucide-react'
import { Spinner, EmptyState, PageHeader, Modal, Field } from '../../components/UI'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

export default function Attendance() {
  const [logs,    setLogs]    = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showManual, setManual] = useState(false)
  const [selectedId, setSelected] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await getTodayAttendance()
      setLogs(data.logs || [])
    } catch { toast.error('Failed to load attendance') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    getMembers({ is_active: true }).then(r => setMembers(r.data)).catch(() => {})
  }, [])

  async function handleManual(e) {
    e.preventDefault()
    if (!selectedId) return toast.error('Select a member')
    setSaving(true)
    try {
      const { data } = await manualCheckin(selectedId)
      toast.success(data.message || 'Checked in!')
      setManual(false); setSelected(''); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  const alreadyIn = logs.map(l => l.member_id)

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Attendance" sub={`Today — ${format(new Date(), 'dd MMM yyyy')} · ${logs.length} check-ins`}>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4"/> Refresh
        </button>
        <button onClick={() => setManual(true)} className="btn-primary flex items-center gap-2">
          <PlusCircle className="w-4 h-4"/> Manual Check-In
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {loading ? <Spinner/> : logs.length === 0 ? (
          <EmptyState
            icon={<UserCheck className="w-16 h-16 text-gray-300"/>}
            title="No check-ins yet today"
            sub="Members can scan the gym QR code or you can add manual check-ins"
            action={<button onClick={() => setManual(true)} className="btn-primary">Add Manual Check-In</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">#</th>
                <th className="th">Member</th>
                <th className="th">Phone</th>
                <th className="th">Time</th>
                <th className="th">Method</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log, i) => (
                  <tr key={log.log_id} className="hover:bg-gray-50">
                    <td className="td text-gray-400 text-xs">{i + 1}</td>
                    <td className="td font-medium">{log.member_name}</td>
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
          </div>
        )}
      </div>

      {showManual && (
        <Modal title="Manual Check-In" onClose={() => setManual(false)}>
          <form onSubmit={handleManual} className="space-y-4">
            <Field label="Select Member" required>
              <select className="input" required value={selectedId}
                onChange={e => setSelected(e.target.value)}>
                <option value="">Choose member…</option>
                {members
                  .filter(m => !alreadyIn.includes(m.id))
                  .map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
              </select>
            </Field>
            {selectedId && alreadyIn.includes(selectedId) && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                This member has already checked in today.
              </p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setManual(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Checking in…' : 'Check In'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

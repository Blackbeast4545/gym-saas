import { useEffect, useState } from 'react'
import { getStaff, createStaff, updateStaff, removeStaff } from '../../services/api'
import { Plus, UserX, Edit2 } from 'lucide-react'
import { Modal, Field, Spinner, EmptyState, PageHeader } from '../../components/UI'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = { name:'', phone:'', email:'', password:'', role:'receptionist' }

export default function Staff() {
  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setAdd]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const { user } = useAuth()

  function load() {
    setLoading(true)
    getStaff().then(r => setStaff(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const payload = { name: form.name, phone: form.phone, email: form.email || null, role: form.role }
        if (form.password) payload.password = form.password
        await updateStaff(editing.id, payload)
        toast.success('Staff updated!')
      } else {
        await createStaff(form)
        toast.success('Staff added!')
      }
      setAdd(false); setEditing(null); setForm(EMPTY_FORM); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  function openEdit(s) {
    setForm({ name: s.name, phone: s.phone, email: s.email || '', password: '', role: s.role })
    setEditing(s); setAdd(true)
  }

  async function handleRemove(s) {
    if (!confirm(`Remove ${s.name}?`)) return
    try {
      await removeStaff(s.id)
      toast.success('Staff removed'); load()
    } catch { toast.error('Failed') }
  }

  const fmtDate = s => { try { return format(parseISO(s), 'dd MMM yyyy') } catch { return '—' } }

  if (user?.role !== 'owner') {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">Owner access only</p>
          <p className="text-sm mt-1">Staff management is restricted to gym owners</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Staff" sub={`${staff.length} staff members`}>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setAdd(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4"/> Add Staff
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {loading ? <Spinner/> : staff.length === 0 ? (
          <EmptyState icon={<svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
            title="No staff yet" sub="Add a receptionist to help manage the gym"
            action={<button onClick={() => setAdd(true)} className="btn-primary">Add Staff</button>}/>
        ) : (
          <table className="w-full">
            <thead><tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Added</th>
              <th className="th">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="td font-medium">{s.name}</td>
                  <td className="td text-gray-500">{s.phone}</td>
                  <td className="td text-gray-500">{s.email || '—'}</td>
                  <td className="td">
                    <span className={
                      s.role === 'owner' ? 'badge-info'
                        : s.role === 'trainer' ? 'badge-warning'
                        : 'badge-active'
                    }>
                      {s.role}
                    </span>
                  </td>
                  <td className="td text-gray-400">{fmtDate(s.created_at)}</td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      {s.role !== 'owner' && (
                        <>
                          <button onClick={() => openEdit(s)}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                            <Edit2 className="w-3.5 h-3.5"/> Edit
                          </button>
                          <button onClick={() => handleRemove(s)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                            <UserX className="w-3.5 h-3.5"/> Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title={editing ? `Edit Staff — ${editing.name}` : 'Add Staff Member'} onClose={() => { setAdd(false); setEditing(null) }}>
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Full Name" required>
              <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
            </Field>
            <Field label="Phone" required>
              <input className="input" required maxLength={10} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
            </Field>
            <Field label={editing ? 'New Password (leave blank to keep current)' : 'Password'} required={!editing}>
              <input className="input" type="password" required={!editing} value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder={editing ? 'Leave blank to keep current' : ''}/>
            </Field>
            <Field label="Role">
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="receptionist">Receptionist</option>
                <option value="trainer">Trainer</option>
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setAdd(false); setEditing(null) }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : editing ? 'Update Staff' : 'Add Staff'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { getMembers, createMember, updateMember, deactivateMember, getPlans, recordPayment } from '../../services/api'
import { Plus, Search, Filter, Eye, Edit2, UserX } from 'lucide-react'
import { Modal, Field, Spinner, EmptyState, PageHeader } from '../../components/UI'
import { format, parseISO, addDays } from 'date-fns'
import toast from 'react-hot-toast'

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'expiring', label: 'Expiring (7d)' },
  { key: 'expired',  label: 'Expired' },
]

const EMPTY_FORM = {
  name:'', phone:'', email:'', dob:'', gender:'', address:'',
  emergency_contact:'', join_date: new Date().toISOString().split('T')[0],
  plan_expiry:'', membership_plan_id:'',
}

export default function Members() {
  const [members, setMembers] = useState([])
  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [showAdd, setAdd]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filter === 'expiring') params.expiring_in_days = 7
      if (filter === 'expired')  params.is_active = true
      const { data } = await getMembers(params)
      let result = data
      if (filter === 'expired') result = data.filter(m => m.plan_expiry && new Date(m.plan_expiry) < new Date())
      setMembers(result)
    } catch { toast.error('Failed to load members') }
    finally { setLoading(false) }
  }, [search, filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { getPlans().then(r => setPlans(r.data)).catch(() => {}) }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await updateMember(editing.id, form)
        toast.success('Member updated!')
      } else {
        await createMember(form)
        toast.success('Member added!')
      }
      setAdd(false); setEditing(null); setForm(EMPTY_FORM); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally { setSaving(false) }
  }

  async function handleDeactivate(m) {
    if (!confirm(`Deactivate ${m.name}?`)) return
    try {
      await deactivateMember(m.id)
      toast.success('Member deactivated')
      load()
    } catch { toast.error('Failed') }
  }

  function openEdit(m) {
    setForm({
      name: m.name, phone: m.phone, email: m.email || '',
      dob: m.dob || '', gender: m.gender || '', address: m.address || '',
      emergency_contact: m.emergency_contact || '',
      join_date: m.join_date || '', plan_expiry: m.plan_expiry || '',
    })
    setEditing(m); setAdd(true)
  }

  const fmtDate = s => { try { return format(parseISO(s), 'dd MMM yyyy') } catch { return s || '—' } }
  const isExpired = m => m.plan_expiry && new Date(m.plan_expiry) < new Date()
  const expiresIn = m => {
    if (!m.plan_expiry) return null
    const d = Math.ceil((new Date(m.plan_expiry) - new Date()) / 86400000)
    return d
  }

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Members" sub={`${members.length} members`}>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setAdd(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4"/> Add Member
        </button>
      </PageHeader>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input className="input pl-9" placeholder="Search name or phone…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${filter === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <Spinner/> : members.length === 0 ? (
          <EmptyState icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>}
            title="No members yet"
            sub="Add your first member to get started"
            action={<button onClick={() => setAdd(true)} className="btn-primary">Add Member</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Member</th>
                <th className="th">Phone</th>
                <th className="th">Joined</th>
                <th className="th">Plan Expiry</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {members.map(m => {
                  const days = expiresIn(m)
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{m.name}</p>
                            {m.email && <p className="text-xs text-gray-400">{m.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="td text-gray-500">{m.phone}</td>
                      <td className="td text-gray-500">{fmtDate(m.join_date)}</td>
                      <td className="td">
                        {m.plan_expiry ? (
                          <span className={isExpired(m) ? 'text-red-600 font-medium' : days <= 7 ? 'text-yellow-600 font-medium' : ''}>
                            {fmtDate(m.plan_expiry)}
                            {days !== null && !isExpired(m) && days <= 7 && <span className="text-xs ml-1">({days}d)</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="td">
                        {isExpired(m)
                          ? <span className="badge-inactive">Expired</span>
                          : days !== null && days <= 7
                            ? <span className="badge-warning">Expiring</span>
                            : <span className="badge-active">Active</span>
                        }
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewing(m)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary transition-colors" title="View">
                            <Eye className="w-4 h-4"/>
                          </button>
                          <button onClick={() => openEdit(m)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleDeactivate(m)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Deactivate">
                            <UserX className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <Modal title={editing ? 'Edit Member' : 'Add New Member'} onClose={() => { setAdd(false); setEditing(null) }} wide>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Full Name" required>
                <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
              </Field>
              <Field label="Phone" required>
                <input className="input" required maxLength={10} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/>
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
              </Field>
              <Field label="Date of Birth">
                <input className="input" type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})}/>
              </Field>
              <Field label="Gender">
                <select className="input" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Emergency Contact">
                <input className="input" maxLength={10} value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})}/>
              </Field>
              <Field label="Join Date">
                <input className="input" type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})}/>
              </Field>
              <Field label="Plan Expiry">
                <input className="input" type="date" value={form.plan_expiry} onChange={e => setForm({...form, plan_expiry: e.target.value})}/>
              </Field>
            </div>
            <Field label="Address">
              <input className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})}/>
            </Field>
            {!editing && plans.length > 0 && (
              <div className="mt-3">
                <Field label="Membership Plan">
                  <select className="input" value={form.membership_plan_id} onChange={e => {
                    const p = plans.find(pl => pl.id === e.target.value)
                    setForm({...form, membership_plan_id: e.target.value,
                      plan_expiry: p ? format(addDays(new Date(), p.duration_days), 'yyyy-MM-dd') : form.plan_expiry})
                  }}>
                    <option value="">Select plan (optional)</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price} / {p.duration_days}d</option>)}
                  </select>
                </Field>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => { setAdd(false); setEditing(null) }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : editing ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {viewing && (
        <Modal title="Member Profile" onClose={() => setViewing(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold">
                {viewing.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold">{viewing.name}</p>
                <p className="text-gray-500 text-sm">{viewing.phone}</p>
              </div>
            </div>
            {[
              ['Email',             viewing.email],
              ['Date of Birth',     fmtDate(viewing.dob)],
              ['Gender',            viewing.gender],
              ['Address',           viewing.address],
              ['Emergency Contact', viewing.emergency_contact],
              ['Joined',            fmtDate(viewing.join_date)],
              ['Plan Expiry',       fmtDate(viewing.plan_expiry)],
            ].filter(([,v]) => v).map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="text-gray-500">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setViewing(null); openEdit(viewing) }} className="btn-secondary flex-1">Edit</button>
              <button onClick={() => setViewing(null)} className="btn-primary flex-1">Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

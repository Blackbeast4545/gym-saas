import { useEffect, useState } from 'react'
import { getPlans, createPlan, updatePlan, deletePlan } from '../../services/api'
import { Plus, Tag, Edit2, Trash2 } from 'lucide-react'
import { Modal, Field, Spinner, EmptyState, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = { name:'', duration_days:'30', price:'', description:'' }

export default function Plans() {
  const [plans,   setPlans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setAdd]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  function load() {
    setLoading(true)
    getPlans().then(r => setPlans(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, duration_days: Number(form.duration_days), price: Number(form.price) }
      if (editing) {
        await updatePlan(editing.id, payload)
        toast.success('Plan updated!')
      } else {
        await createPlan(payload)
        toast.success('Plan created!')
      }
      setAdd(false); setEditing(null); setForm(EMPTY_FORM); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSaving(false) }
  }

  function openEdit(p) {
    setForm({ name: p.name, duration_days: String(p.duration_days), price: String(p.price), description: p.description || '' })
    setEditing(p); setAdd(true)
  }

  async function handleDelete(p) {
    if (!confirm(`Deactivate "${p.name}" plan?`)) return
    try {
      await deletePlan(p.id)
      toast.success('Plan deactivated')
      load()
    } catch { toast.error('Failed to deactivate plan') }
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Membership Plans" sub={`${plans.length} plans`}>
        {isOwner && (
          <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setAdd(true) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4"/> Add Plan
          </button>
        )}
      </PageHeader>

      {loading ? <Spinner/> : plans.length === 0 ? (
        <EmptyState icon={<Tag className="w-16 h-16 text-gray-300"/>}
          title="No plans yet" sub="Create membership plans to assign to members"
          action={isOwner ? <button onClick={() => setAdd(true)} className="btn-primary">Add Plan</button> : null}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-primary"/>
                </div>
                <span className="badge-active">Active</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{p.name}</h3>
              {p.description && <p className="text-xs text-gray-400 mt-1 mb-3">{p.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-2xl font-bold text-primary">₹{parseFloat(p.price).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{p.duration_days} days</p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(p)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Deactivate">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title={editing ? 'Edit Membership Plan' : 'Add Membership Plan'} onClose={() => { setAdd(false); setEditing(null) }}>
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Plan Name" required>
              <input className="input" required value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. Monthly, Quarterly, Yearly"/>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (days)" required>
                <input className="input" type="number" required value={form.duration_days}
                  onChange={e => setForm({...form, duration_days: e.target.value})}/>
              </Field>
              <Field label="Price (₹)" required>
                <input className="input" type="number" required value={form.price}
                  onChange={e => setForm({...form, price: e.target.value})}/>
              </Field>
            </div>
            <Field label="Description">
              <input className="input" value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Optional details"/>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setAdd(false); setEditing(null) }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : editing ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

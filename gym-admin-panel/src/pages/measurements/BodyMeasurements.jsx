import { useEffect, useState } from 'react'
import { getMembers, recordMeasurement, getMemberMeasurements, updateMeasurement, deleteMeasurement } from '../../services/api'
import { Plus, Ruler, Trash2, Pencil } from 'lucide-react'
import { Modal, Field, Spinner, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'

const FIELDS = [
  { key:'weight', label:'Weight (kg)', placeholder:'e.g. 72.5' },
  { key:'height', label:'Height (cm)', placeholder:'e.g. 175' },
  { key:'chest', label:'Chest (cm)', placeholder:'e.g. 95' },
  { key:'waist', label:'Waist (cm)', placeholder:'e.g. 80' },
  { key:'hips', label:'Hips (cm)', placeholder:'e.g. 96' },
  { key:'biceps', label:'Biceps (cm)', placeholder:'e.g. 35' },
  { key:'thighs', label:'Thighs (cm)', placeholder:'e.g. 55' },
  { key:'body_fat', label:'Body Fat (%)', placeholder:'e.g. 18' },
]

const emptyForm = () => ({
  member_id:'', measured_at: new Date().toISOString().split('T')[0],
  weight:'', height:'', chest:'', waist:'', hips:'', biceps:'', thighs:'', body_fat:'', notes:''
})

export default function BodyMeasurements() {
  const [members, setMembers] = useState([])
  const [selMember, setSelMember] = useState('')
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    getMembers({ is_active:true }).then(r => setMembers(r.data)).catch(()=>{})
  }, [])

  async function loadRecords(memberId) {
    if (!memberId) return
    setLoadingRecords(true)
    try { const { data } = await getMemberMeasurements(memberId); setRecords(data) }
    catch { setRecords([]) }
    finally { setLoadingRecords(false) }
  }

  function openAdd() {
    setForm({...emptyForm(), member_id: selMember || ''})
    setShowForm(true)
  }

  function openEdit(rec) {
    setForm({
      member_id: rec.member_id,
      measured_at: rec.measured_at,
      weight: rec.weight?.toString() || '',
      height: rec.height?.toString() || '',
      chest: rec.chest?.toString() || '',
      waist: rec.waist?.toString() || '',
      hips: rec.hips?.toString() || '',
      biceps: rec.biceps?.toString() || '',
      thighs: rec.thighs?.toString() || '',
      body_fat: rec.body_fat?.toString() || '',
      notes: rec.notes || '',
    })
    setShowEdit(rec)
  }

  function buildPayload() {
    const p = { member_id: form.member_id, measured_at: form.measured_at, notes: form.notes || null }
    for (const f of FIELDS) {
      p[f.key] = form[f.key] ? Number(form[f.key]) : null
    }
    return p
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.member_id) return toast.error('Select a member')
    setSaving(true)
    try {
      await recordMeasurement(buildPayload())
      toast.success('Measurement recorded!')
      setShowForm(false); setForm(emptyForm())
      if (selMember === form.member_id) loadRecords(selMember)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPayload()
      delete payload.member_id
      await updateMeasurement(showEdit.id, payload)
      toast.success('Measurement updated!')
      setShowEdit(null); setForm(emptyForm())
      loadRecords(selMember)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this measurement record?')) return
    try { await deleteMeasurement(id); toast.success('Deleted'); loadRecords(selMember) }
    catch { toast.error('Failed to delete') }
  }

  function MeasurementForm({ onSubmit, submitLabel, showMember = true }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          {showMember && (
            <Field label="Member" required>
              <select className="input" required value={form.member_id}
                onChange={e => setForm({...form, member_id: e.target.value})}>
                <option value="">Select…</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
              </select>
            </Field>
          )}
          <Field label="Date" required>
            <input className="input" type="date" required value={form.measured_at}
              onChange={e => setForm({...form, measured_at: e.target.value})}/>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => (
            <Field key={f.key} label={f.label}>
              <input className="input" type="number" step="0.1" placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}/>
            </Field>
          ))}
        </div>
        <Field label="Notes">
          <textarea className="input resize-none" rows={2} value={form.notes}
            onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes…"/>
        </Field>
        <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
          <button type="button" onClick={() => { setShowForm(false); setShowEdit(null); setForm(emptyForm()) }} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Body Measurements" sub="Record and track member body stats">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4"/> Record Measurement
        </button>
      </PageHeader>

      {/* Member selector */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-3">View Member History</h3>
        <select className="input max-w-xs" value={selMember}
          onChange={e => { setSelMember(e.target.value); loadRecords(e.target.value) }}>
          <option value="">Select member…</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
        </select>

        {loadingRecords && <div className="mt-4"><Spinner/></div>}

        {!loadingRecords && selMember && records.length === 0 && (
          <div className="mt-4 text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">
            No measurements recorded for this member yet.
            <button onClick={openAdd} className="ml-2 text-primary hover:underline">Record now →</button>
          </div>
        )}

        {records.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3">Date</th>
                  {FIELDS.map(f => <th key={f.key} className="py-2 pr-3">{f.label.split('(')[0].trim()}</th>)}
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 font-medium text-gray-700">{r.measured_at}</td>
                    {FIELDS.map(f => (
                      <td key={f.key} className="py-2.5 pr-3 text-gray-600">
                        {r[f.key] != null ? r[f.key] : '—'}
                      </td>
                    ))}
                    <td className="py-2.5 pr-3 text-gray-500 text-xs max-w-[120px] truncate">{r.notes || '—'}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Edit">
                          <Pencil className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showForm && (
        <Modal title="Record Body Measurement" onClose={() => { setShowForm(false); setForm(emptyForm()) }} wide>
          <MeasurementForm onSubmit={handleSave} submitLabel="Save Measurement"/>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Measurement" onClose={() => { setShowEdit(null); setForm(emptyForm()) }} wide>
          <MeasurementForm onSubmit={handleUpdate} submitLabel="Update" showMember={false}/>
        </Modal>
      )}
    </div>
  )
}

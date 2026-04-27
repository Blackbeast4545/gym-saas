import { useEffect, useState } from 'react'
import { getAllDietPlans, getMemberDiet, createDiet, updateDiet, deleteDiet, getMembers } from '../../services/api'
import { Plus, Utensils, Trash2, Pencil, User, X } from 'lucide-react'
import { Modal, Field, Spinner, EmptyState, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'

const MEAL_TYPES = ['breakfast','lunch','dinner','snacks']
const mealIcons = { breakfast:'🌅', lunch:'☀️', dinner:'🌙', snacks:'🍎' }

const emptyMeals = () => ({ breakfast:[{food:'',quantity:'',calories:''}], lunch:[{food:'',quantity:'',calories:''}], dinner:[{food:'',quantity:'',calories:''}], snacks:[] })

export default function Diet() {
  const [members,    setMembers]    = useState([])
  const [allPlans,   setAllPlans]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setCreate]     = useState(false)
  const [showEdit,   setShowEdit]   = useState(null)
  const [saving,     setSaving]     = useState(false)

  const [form, setForm] = useState({
    member_id:'', title:'', calories_target:'', protein_target:'', notes:'',
    valid_from:'', valid_to:'', meals: emptyMeals()
  })

  function resetForm() {
    setForm({ member_id:'', title:'', calories_target:'', protein_target:'', notes:'', valid_from:'', valid_to:'', meals: emptyMeals() })
  }

  useEffect(() => {
    getMembers({ is_active:true }).then(r => setMembers(r.data)).catch(()=>{})
    loadAll()
  }, [])

  function loadAll() {
    setLoading(true)
    getAllDietPlans()
      .then(r => setAllPlans(r.data))
      .catch(() => toast.error('Failed to load diet plans'))
      .finally(() => setLoading(false))
  }

  function openEdit(plan) {
    setForm({
      member_id: plan.member_id, title: plan.title,
      calories_target: plan.calories_target?.toString() || '',
      protein_target: plan.protein_target?.toString() || '',
      notes: plan.notes || '',
      valid_from: plan.valid_from || '', valid_to: plan.valid_to || '',
      meals: Object.fromEntries(MEAL_TYPES.map(m => [m,
        (plan.meals?.[m] || []).length > 0
          ? plan.meals[m].map(i => ({ food: i.food||'', quantity: i.quantity||'', calories: i.calories?.toString()||'' }))
          : []
      ]))
    })
    setShowEdit(plan)
  }

  function addItem(meal) {
    setForm(f => ({...f, meals:{...f.meals, [meal]: [...(f.meals[meal]||[]), {food:'',quantity:'',calories:''}]}}))
  }
  function removeItem(meal, i) {
    setForm(f => ({...f, meals:{...f.meals, [meal]: f.meals[meal].filter((_,j)=>j!==i)}}))
  }
  function updateItem(meal, i, key, val) {
    setForm(f => ({...f, meals:{...f.meals, [meal]: f.meals[meal].map((it,j) => j===i ? {...it,[key]:val} : it)}}))
  }

  function buildPayload() {
    const cleanMeals = {}
    for (const m of MEAL_TYPES) {
      cleanMeals[m] = (form.meals[m]||[])
        .filter(i => i.food.trim())
        .map(i => ({food:i.food, quantity:i.quantity||null, calories: i.calories ? Number(i.calories) : null}))
    }
    return {
      member_id: form.member_id, title: form.title || 'Diet Plan',
      meals: cleanMeals,
      calories_target: form.calories_target ? Number(form.calories_target) : null,
      protein_target: form.protein_target ? Number(form.protein_target) : null,
      notes: form.notes || null,
      valid_from: form.valid_from || null, valid_to: form.valid_to || null,
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.member_id) return toast.error('Select a member')
    setSaving(true)
    try {
      await createDiet(buildPayload())
      toast.success('Diet plan saved!'); setCreate(false); resetForm(); loadAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPayload()
      delete payload.member_id
      await updateDiet(showEdit.id, payload)
      toast.success('Diet plan updated!'); setShowEdit(null); resetForm(); loadAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(planId) {
    if (!confirm('Delete this diet plan?')) return
    try { await deleteDiet(planId); toast.success('Diet plan deleted'); loadAll() }
    catch { toast.error('Failed to delete') }
  }

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  function MealForm() {
    return MEAL_TYPES.map(meal => (
      <div key={meal} className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-sm capitalize">{mealIcons[meal]} {meal}</p>
          <button type="button" onClick={() => addItem(meal)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3"/> Add item
          </button>
        </div>
        {(form.meals[meal]||[]).length === 0 && (
          <p className="text-xs text-gray-400">No items — <button type="button" onClick={() => addItem(meal)} className="text-primary hover:underline">add one</button></p>
        )}
        <div className="space-y-2">
          {(form.meals[meal]||[]).map((item, i) => (
            <div key={i} className="flex gap-2">
              <input className="input text-xs flex-1" placeholder="Food item*" value={item.food}
                onChange={e => updateItem(meal, i, 'food', e.target.value)}/>
              <input className="input text-xs w-24" placeholder="Qty" value={item.quantity}
                onChange={e => updateItem(meal, i, 'quantity', e.target.value)}/>
              <input className="input text-xs w-20" placeholder="kcal" type="number" value={item.calories}
                onChange={e => updateItem(meal, i, 'calories', e.target.value)}/>
              <button type="button" onClick={() => removeItem(meal, i)}
                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          ))}
        </div>
      </div>
    ))
  }

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Diet Plans" sub={`${allPlans.length} plans across all members`}>
        <button onClick={() => { resetForm(); setCreate(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4"/> Create Diet Plan
        </button>
      </PageHeader>

      {loading ? <Spinner/> : allPlans.length === 0 ? (
        <EmptyState icon={<Utensils className="w-16 h-16 text-gray-300"/>}
          title="No diet plans" sub="Create and assign diet plans to members"
          action={<button onClick={() => setCreate(true)} className="btn-primary">Create Plan</button>}/>
      ) : (
        <div className="space-y-3">
          {allPlans.map(plan => {
            const mem = memberMap[plan.member_id]
            return (
              <div key={plan.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                      <Utensils className="w-4 h-4 text-orange-500"/>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{plan.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3"/>
                        {mem ? `${mem.name} — ${mem.phone}` : plan.member_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.calories_target && <span className="text-xs text-gray-500">🔥 {plan.calories_target} kcal</span>}
                    {plan.protein_target && <span className="text-xs text-gray-500">💪 {plan.protein_target}g</span>}
                    <button onClick={() => openEdit(plan)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => handleDelete(plan.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {MEAL_TYPES.map(meal => {
                    const items = plan.meals?.[meal] || []
                    if (!items.length) return null
                    return (
                      <div key={meal} className="border border-gray-100 rounded-xl p-3">
                        <p className="font-medium text-xs mb-1.5 capitalize">{mealIcons[meal]} {meal}</p>
                        <div className="space-y-0.5">
                          {items.map((it, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-600">
                              <span>{it.food} {it.quantity ? `— ${it.quantity}` : ''}</span>
                              {it.calories && <span className="text-gray-400">{it.calories} kcal</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {plan.notes && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg mt-2">{plan.notes}</p>}
                {(plan.valid_from || plan.valid_to) && (
                  <p className="text-xs text-gray-400 mt-2">
                    {plan.valid_from && `From: ${plan.valid_from}`}{plan.valid_from && plan.valid_to && ' — '}{plan.valid_to && `To: ${plan.valid_to}`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create Diet Plan" onClose={() => { setCreate(false); resetForm() }} wide>
          <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Member" required>
                <select className="input" required value={form.member_id}
                  onChange={e => setForm({...form, member_id: e.target.value})}>
                  <option value="">Select…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
                </select>
              </Field>
              <Field label="Plan Title">
                <input className="input" value={form.title} placeholder="e.g. Weight Loss Plan"
                  onChange={e => setForm({...form, title: e.target.value})}/>
              </Field>
              <Field label="Calorie Target">
                <input className="input" type="number" value={form.calories_target} placeholder="e.g. 2000"
                  onChange={e => setForm({...form, calories_target: e.target.value})}/>
              </Field>
              <Field label="Protein Target (g)">
                <input className="input" type="number" value={form.protein_target} placeholder="e.g. 120"
                  onChange={e => setForm({...form, protein_target: e.target.value})}/>
              </Field>
              <Field label="Valid From">
                <input className="input" type="date" value={form.valid_from}
                  onChange={e => setForm({...form, valid_from: e.target.value})}/>
              </Field>
              <Field label="Valid To">
                <input className="input" type="date" value={form.valid_to}
                  onChange={e => setForm({...form, valid_to: e.target.value})}/>
              </Field>
            </div>
            <MealForm/>
            <Field label="Notes">
              <textarea className="input resize-none" rows={2} value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional instructions…"/>
            </Field>
            <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
              <button type="button" onClick={() => { setCreate(false); resetForm() }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save Diet Plan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title={`Edit "${showEdit.title}"`} onClose={() => { setShowEdit(null); resetForm() }} wide>
          <form onSubmit={handleUpdate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assigned To">
                <input className="input bg-gray-50" disabled value={memberMap[showEdit.member_id]?.name || showEdit.member_id}/>
              </Field>
              <Field label="Plan Title">
                <input className="input" value={form.title} placeholder="e.g. Weight Loss Plan"
                  onChange={e => setForm({...form, title: e.target.value})}/>
              </Field>
              <Field label="Calorie Target">
                <input className="input" type="number" value={form.calories_target} placeholder="e.g. 2000"
                  onChange={e => setForm({...form, calories_target: e.target.value})}/>
              </Field>
              <Field label="Protein Target (g)">
                <input className="input" type="number" value={form.protein_target} placeholder="e.g. 120"
                  onChange={e => setForm({...form, protein_target: e.target.value})}/>
              </Field>
              <Field label="Valid From">
                <input className="input" type="date" value={form.valid_from}
                  onChange={e => setForm({...form, valid_from: e.target.value})}/>
              </Field>
              <Field label="Valid To">
                <input className="input" type="date" value={form.valid_to}
                  onChange={e => setForm({...form, valid_to: e.target.value})}/>
              </Field>
            </div>
            <MealForm/>
            <Field label="Notes">
              <textarea className="input resize-none" rows={2} value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional instructions…"/>
            </Field>
            <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
              <button type="button" onClick={() => { setShowEdit(null); resetForm() }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Updating…' : 'Update Plan'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

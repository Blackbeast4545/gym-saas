import { useEffect, useState } from 'react'
import { getWorkoutPlans, createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan, assignWorkout, getMembers, getWorkoutPlanMembers, unassignWorkout } from '../../services/api'
import { Plus, Dumbbell, User, ChevronDown, ChevronUp, Trash2, Pencil, X, Users } from 'lucide-react'
import { Modal, Field, Spinner, EmptyState, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function ExerciseRow({ ex, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="grid grid-cols-2 gap-2 flex-1">
        <input className="input text-xs" placeholder="Exercise name*" value={ex.name}
          onChange={e => onChange({...ex, name: e.target.value})} required/>
        <input className="input text-xs" placeholder="Sets (e.g. 3)" value={ex.sets}
          onChange={e => onChange({...ex, sets: e.target.value})}/>
        <input className="input text-xs" placeholder="Reps (e.g. 10-12)" value={ex.reps}
          onChange={e => onChange({...ex, reps: e.target.value})}/>
        <input className="input text-xs" placeholder="Rest (e.g. 60s)" value={ex.rest}
          onChange={e => onChange({...ex, rest: e.target.value})}/>
      </div>
      <button type="button" onClick={onRemove}
        className="mt-1 p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
        <Trash2 className="w-3.5 h-3.5"/>
      </button>
    </div>
  )
}

const emptyDay = () => ({ day_name:'Monday', day_number:1, exercises:[{ name:'',sets:'',reps:'',rest:'',notes:'' }] })
const emptyExercise = () => ({ name:'',sets:'',reps:'',rest:'',notes:'' })

export default function Workout() {
  const [plans,   setPlans]   = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [showAssign, setAssign] = useState(null)
  const [showMembers, setShowMembers] = useState(null)
  const [planMembers, setPlanMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState(false)
  const [assignData, setAssignData] = useState({ member_id:'', workout_plan_id:'' })

  const [planName, setPlanName] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [days, setDays] = useState([emptyDay()])

  function load() {
    setLoading(true)
    getWorkoutPlans()
      .then(r => setPlans(r.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { getMembers({ is_active:true }).then(r => setMembers(r.data)).catch(()=>{}) }, [])

  function resetForm() { setPlanName(''); setPlanDesc(''); setDays([emptyDay()]) }

  function openEdit(plan) {
    setPlanName(plan.name)
    setPlanDesc(plan.description || '')
    setDays(plan.days?.map(d => ({
      day_name: d.day_name, day_number: d.day_number,
      exercises: d.exercises?.length > 0 ? d.exercises.map(e => ({
        name: e.name||'', sets: e.sets?.toString()||'', reps: e.reps||'', rest: e.rest||'', notes: e.notes||''
      })) : [emptyExercise()]
    })) || [emptyDay()])
    setShowEdit(plan)
  }

  async function loadPlanMembers(plan) {
    setShowMembers(plan); setLoadingMembers(true)
    try { const { data } = await getWorkoutPlanMembers(plan.id); setPlanMembers(data) }
    catch { setPlanMembers([]) }
    finally { setLoadingMembers(false) }
  }

  async function handleUnassign(memberId) {
    try { await unassignWorkout(memberId); toast.success('Member unassigned'); setPlanMembers(p => p.filter(m => m.member_id !== memberId)) }
    catch { toast.error('Failed to unassign') }
  }

  function addDay() { setDays([...days, { day_name:'Monday', day_number: days.length+1, exercises:[emptyExercise()] }]) }
  function removeDay(i) { setDays(days.filter((_, j) => j !== i)) }
  function updateDay(i, key, val) { setDays(days.map((d, j) => j===i ? {...d, [key]:val} : d)) }
  function addExercise(di) { setDays(days.map((d,j) => j===di ? {...d, exercises:[...d.exercises, emptyExercise()]} : d)) }
  function updateExercise(di, ei, val) { setDays(days.map((d,j) => j===di ? {...d, exercises: d.exercises.map((e,k) => k===ei ? val : e)} : d)) }
  function removeExercise(di, ei) { setDays(days.map((d,j) => j===di ? {...d, exercises: d.exercises.filter((_,k) => k!==ei)} : d)) }

  function buildPayload() {
    return {
      name: planName, description: planDesc,
      days: days.map((d, i) => ({
        ...d, day_number: i+1,
        exercises: d.exercises.filter(e => e.name.trim())
          .map(e => ({ name: e.name, sets: e.sets ? Number(e.sets) : null, reps: e.reps||null, rest: e.rest||null, notes: e.notes||null }))
      }))
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!planName.trim()) return toast.error('Enter plan name')
    setSaving(true)
    try { await createWorkoutPlan(buildPayload()); toast.success('Workout plan created!'); setCreate(false); resetForm(); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!planName.trim()) return toast.error('Enter plan name')
    setSaving(true)
    try { await updateWorkoutPlan(showEdit.id, buildPayload()); toast.success('Workout plan updated!'); setShowEdit(null); resetForm(); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(planId) {
    if (!confirm('Deactivate this workout plan?')) return
    try { await deleteWorkoutPlan(planId); toast.success('Plan deactivated'); load() }
    catch { toast.error('Failed to delete') }
  }

  async function handleAssign(e) {
    e.preventDefault(); setSaving(true)
    try { await assignWorkout({ member_id: assignData.member_id, workout_plan_id: assignData.workout_plan_id }); toast.success('Plan assigned!'); setAssign(null) }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  function PlanForm({ onSubmit, submitLabel }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan Name" required>
            <input className="input" required value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Beginner Strength"/>
          </Field>
          <Field label="Description">
            <input className="input" value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="Optional"/>
          </Field>
        </div>
        {days.map((day, di) => (
          <div key={di} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select className="input w-36 text-sm" value={day.day_name}
                  onChange={e => updateDay(di, 'day_name', e.target.value)}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
                <span className="text-xs text-gray-400">Day {di+1}</span>
              </div>
              <button type="button" onClick={() => removeDay(di)} className="text-xs text-red-400 hover:underline">Remove day</button>
            </div>
            <div className="space-y-2">
              {day.exercises.map((ex, ei) => (
                <ExerciseRow key={ei} ex={ex} onChange={val => updateExercise(di, ei, val)} onRemove={() => removeExercise(di, ei)}/>
              ))}
            </div>
            <button type="button" onClick={() => addExercise(di)} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3"/> Add exercise
            </button>
          </div>
        ))}
        <button type="button" onClick={addDay} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/> Add Day
        </button>
        <div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
          <button type="button" onClick={() => { setCreate(false); setShowEdit(null); resetForm() }} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="Workout Plans" sub={`${plans.length} plans`}>
        <button onClick={() => { resetForm(); setCreate(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4"/> Create Plan
        </button>
      </PageHeader>

      {loading ? <Spinner/> : plans.length === 0 ? (
        <EmptyState icon={<Dumbbell className="w-16 h-16 text-gray-300"/>}
          title="No workout plans" sub="Create your first workout plan"
          action={<button onClick={() => setCreate(true)} className="btn-primary">Create Plan</button>}/>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(e => ({...e, [plan.id]: !e[plan.id]}))}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-primary"/>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    {plan.description && <p className="text-xs text-gray-400">{plan.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{plan.days?.length || 0} days</span>
                  <button onClick={e => { e.stopPropagation(); loadPlanMembers(plan) }}
                    className="btn-secondary text-xs flex items-center gap-1 py-1.5" title="View assigned members">
                    <Users className="w-3.5 h-3.5"/> Members
                  </button>
                  <button onClick={e => { e.stopPropagation(); setAssignData({member_id:'', workout_plan_id: plan.id}); setAssign(plan) }}
                    className="btn-secondary text-xs flex items-center gap-1 py-1.5">
                    <User className="w-3.5 h-3.5"/> Assign
                  </button>
                  <button onClick={e => { e.stopPropagation(); openEdit(plan) }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                    <Pencil className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(plan.id) }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                  {expanded[plan.id] ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                </div>
              </div>
              {expanded[plan.id] && plan.days?.length > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {plan.days.sort((a,b) => (a.day_number||0)-(b.day_number||0)).map(day => (
                    <div key={day.id} className="px-5 py-3">
                      <p className="font-medium text-sm text-gray-700 mb-2">{day.day_name}</p>
                      {(!day.exercises || day.exercises.length === 0) ? (
                        <p className="text-xs text-gray-400">Rest day</p>
                      ) : (
                        <div className="space-y-1">
                          {day.exercises.map((ex, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center font-medium text-[10px]">{i+1}</span>
                              <span className="font-medium">{ex.name}</span>
                              {ex.sets && <span className="text-gray-400">{ex.sets} sets</span>}
                              {ex.reps && <span className="text-gray-400">× {ex.reps} reps</span>}
                              {ex.rest && <span className="text-gray-400">| rest {ex.rest}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create Workout Plan" onClose={() => { setCreate(false); resetForm() }} wide>
          <PlanForm onSubmit={handleCreate} submitLabel="Create Plan"/>
        </Modal>
      )}

      {showEdit && (
        <Modal title={`Edit "${showEdit.name}"`} onClose={() => { setShowEdit(null); resetForm() }} wide>
          <PlanForm onSubmit={handleUpdate} submitLabel="Update Plan"/>
        </Modal>
      )}

      {showAssign && (
        <Modal title={`Assign "${showAssign.name}"`} onClose={() => setAssign(null)}>
          <form onSubmit={handleAssign} className="space-y-4">
            <Field label="Member" required>
              <select className="input" required value={assignData.member_id}
                onChange={e => setAssignData({...assignData, member_id: e.target.value})}>
                <option value="">Select member…</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
              </select>
            </Field>
            <div className="flex gap-3">
              <button type="button" onClick={() => setAssign(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Assigning…' : 'Assign Plan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showMembers && (
        <Modal title={`Members on "${showMembers.name}"`} onClose={() => setShowMembers(null)}>
          {loadingMembers ? <Spinner/> : planMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No members assigned to this plan yet.</p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {planMembers.map(m => (
                <div key={m.member_id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.phone}</p>
                  </div>
                  <button onClick={() => handleUnassign(m.member_id)}
                    className="text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <X className="w-3 h-3"/> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

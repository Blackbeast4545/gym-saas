import { useEffect, useState } from 'react'
import { getGyms, createGym, toggleAccess, updateSubscription } from '../services/api'
import { Plus, Search, Power, RefreshCw, Edit2, Trash2, Printer, Eye } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../services/api'

const PLANS = ['basic','pro','premium']
const PLAN_PRICE = {basic:999,pro:1499,premium:1999}

function Modal({title,onClose,children,wide=false}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide?'max-w-2xl':'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
function Field({label,children}) { return <div><label className="label">{label}</label>{children}</div> }

function numberToWords(n) {
  if (n === 0) return 'Zero'
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  const twoD = (num) => num < 20 ? ones[num] : tens[Math.floor(num/10)] + (num%10 ? '-'+ones[num%10] : '')
  const threeD = (num) => {
    const h = Math.floor(num/100), r = num%100
    let p = []
    if (h) p.push(ones[h]+' Hundred')
    if (r) { if (h) p.push('and'); p.push(twoD(r)) }
    return p.join(' ')
  }
  let parts = [], v = Math.floor(n)
  if (v >= 10000000) { const cr = Math.floor(v/10000000); v %= 10000000; parts.push(threeD(cr)+' Crore') }
  if (v >= 100000) { const lk = Math.floor(v/100000); v %= 100000; parts.push(twoD(lk)+' Lakh') }
  if (v >= 1000) { const th = Math.floor(v/1000); v %= 1000; parts.push(twoD(th)+' Thousand') }
  if (v > 0) parts.push(threeD(v))
  return parts.join(' ')
}

function printReceipt(gym) {
  const sub = gym.subscription
  if (!sub) return toast.error('No subscription found')
  const amt = parseFloat(sub.price_paid)
  const amtWords = numberToWords(amt).toUpperCase() + ' ONLY'
  const w = window.open('','_blank')
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt — ${gym.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;display:flex;justify-content:center;padding:20px}
    .receipt{width:700px;background:#fff;padding:30px 40px}
    .logo-area{text-align:center;margin-bottom:12px}
    .logo-area img{max-height:60px;max-width:200px;object-fit:contain}
    .logo-area h1{font-size:28px;font-weight:900;letter-spacing:2px;color:#4F46E5}
    .logo-area .tagline{font-size:10px;color:#888;margin-top:2px;font-style:italic}
    .divider{border:none;border-top:2px solid #333;margin:12px 0}
    .divider-thin{border:none;border-top:1px solid #ccc;margin:8px 0}
    .info-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
    .info-row b{font-weight:700}
    table.txn{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
    table.txn th,table.txn td{border:1px solid #333;padding:8px 10px;text-align:left}
    table.txn th{background:#f3f4f6;font-weight:700;font-size:12px}
    table.txn .amt{text-align:right;font-weight:600}
    table.txn .total-label{text-align:right;font-weight:700;border-left:none;border-bottom:none}
    table.txn .total-val{text-align:right;font-weight:800;font-size:15px}
    .words-row{display:flex;align-items:center;gap:8px;margin:16px 0;font-size:13px}
    .words-row b{white-space:nowrap}
    .words-row .words{flex:1;border-bottom:1px solid #ccc;padding:2px 6px;font-weight:700;font-size:12px;text-transform:uppercase}
    .sig-row{display:flex;justify-content:space-between;margin-top:50px;font-size:13px}
    .sig-row .left{display:flex;align-items:center;gap:6px}
    .sig-row .line{width:150px;border-bottom:1px solid #333;display:inline-block}
    .sig-row .right{font-weight:700;font-style:italic}
    .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd}
    .footer p{font-size:9px;color:#999;line-height:1.6}
    .footer .brand{font-weight:700;color:#4F46E5}
    @media print{body{padding:0}.receipt{width:100%;padding:20px 30px}}
  </style></head><body>
  <div class="receipt">
    <div class="logo-area">
      ${gym.logo_url ? `<img src="${gym.logo_url}" alt="Logo" onerror="this.style.display='none'"/>` : ''}
      <h1>${gym.logo_url ? gym.name : 'FitNexus'}</h1>
      <div class="tagline">Subscription Receipt</div>
    </div>
    <hr class="divider"/>
    <div class="info-row"><span><b>Gym Name:</b> &nbsp;${gym.name}</span><span><b>Date:</b> &nbsp;${sub.start_date}</span></div>
    <div class="info-row"><span><b>Owner:</b> &nbsp;${gym.owner_name}</span><span><b>Phone:</b> &nbsp;${gym.phone}</span></div>
    <div class="info-row"><span><b>City:</b> &nbsp;${gym.city||'—'}</span><span><b>Plan:</b> &nbsp;<span style="text-transform:capitalize;font-weight:700">${sub.plan}</span></span></div>
    <hr class="divider-thin"/>
    <table class="txn">
      <thead><tr><th style="width:50px">Sr.No.</th><th>Subscription Plan</th><th>Validity Period</th><th style="width:120px;text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>1</td>
          <td style="text-transform:capitalize">${sub.plan} Plan</td>
          <td>From &nbsp;${sub.start_date}&nbsp; to &nbsp;${sub.expiry_date}</td>
          <td class="amt">${amt.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        </tr>
        ${sub.notes ? `<tr><td></td><td colspan="2" style="color:#888;font-size:11px">Notes: ${sub.notes}</td><td></td></tr>` : ''}
        <tr>
          <td style="border:none"></td>
          <td style="border:none"></td>
          <td class="total-label">TOTAL</td>
          <td class="total-val">${amt.toLocaleString('en-IN',{minimumFractionDigits:2})} /-</td>
        </tr>
      </tbody>
    </table>
    <div class="words-row">
      <b>Received Rupees:</b>
      <span class="words">${amtWords}</span>
    </div>
    <div class="sig-row">
      <div class="left"><b>Authorized by</b><span class="line"></span></div>
      <div class="right">FitNexus Admin</div>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt</p>
      <p>Generated on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; <span class="brand">FitNexus Platform</span></p>
    </div>
  </div>
  <script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}

export default function Gyms() {
  const [gyms,setGyms]=useState([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [showCreate,setCreate]=useState(false)
  const [showRenew,setRenew]=useState(null)
  const [showEdit,setEdit]=useState(null)
  const [showDetail,setDetail]=useState(null)
  const [saving,setSaving]=useState(false)
  const emptyForm={name:'',owner_name:'',phone:'',email:'',address:'',city:'',logo_url:'',plan:'basic',price_paid:999,start_date:new Date().toISOString().split('T')[0],expiry_date:'',owner_password:''}
  const [form,setForm]=useState(emptyForm)
  const [editForm,setEditForm]=useState({name:'',owner_name:'',phone:'',email:'',address:'',city:'',logo_url:''})
  const [renewForm,setRenewForm]=useState({plan:'basic',price_paid:999,start_date:new Date().toISOString().split('T')[0],expiry_date:'',notes:''})

  const load=async(q='')=>{
    setLoading(true)
    try{const{data}=await getGyms(q?{search:q}:{});setGyms(data)}
    catch{toast.error('Failed to load gyms')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[])

  const handleCreate=async(e)=>{
    e.preventDefault();setSaving(true)
    try{await createGym(form);toast.success('Gym created!');setCreate(false);setForm(emptyForm);load()}
    catch(err){toast.error(err.response?.data?.detail||'Failed')}
    finally{setSaving(false)}
  }
  const handleEdit=async(e)=>{
    e.preventDefault();setSaving(true)
    try{await api.put(`/super-admin/gyms/${showEdit.id}`,editForm);toast.success('Gym updated!');setEdit(null);load()}
    catch(err){toast.error(err.response?.data?.detail||'Failed')}
    finally{setSaving(false)}
  }
  const handleDelete=async(gym)=>{
    if(!window.confirm(`DELETE "${gym.name}"?\n\nThis permanently deletes the gym and ALL data. This cannot be undone.`))return
    try{await api.delete(`/super-admin/gyms/${gym.id}`);toast.success('Gym deleted');load()}
    catch(err){toast.error(err.response?.data?.detail||'Failed to delete')}
  }
  const handleToggle=async(gym)=>{
    try{await toggleAccess(gym.id);toast.success(`Gym ${gym.is_active?'disabled':'enabled'}`);load()}
    catch{toast.error('Failed')}
  }
  const handleRenew=async(e)=>{
    e.preventDefault();setSaving(true)
    try{await updateSubscription(showRenew.id,renewForm);toast.success('Subscription updated!');setRenew(null);load()}
    catch(err){toast.error(err.response?.data?.detail||'Failed')}
    finally{setSaving(false)}
  }
  const openEdit=(gym)=>{
    setEditForm({name:gym.name,owner_name:gym.owner_name,phone:gym.phone,email:gym.email||'',address:gym.address||'',city:gym.city||'',logo_url:gym.logo_url||''})
    setEdit(gym)
  }
  const fmtDate=s=>{try{return format(parseISO(s),'dd MMM yyyy')}catch{return s}}

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Gyms</h1><p className="text-sm text-gray-500">{gyms.length} gyms registered</p></div>
        <button onClick={()=>setCreate(true)} className="btn-primary flex items-center gap-2 w-fit"><Plus className="w-4 h-4"/>Add Gym</button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input className="input pl-9" placeholder="Search by name, phone, city…" value={search} onChange={e=>{setSearch(e.target.value);load(e.target.value)}}/>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Gym','Owner','Plan','Expiry','Members','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading?<tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">Loading…</td></tr>
              :gyms.length===0?<tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No gyms found</td></tr>
              :gyms.map(gym=>(
                <tr key={gym.id} className="hover:bg-gray-50">
                  <td className="table-td"><div className="font-medium">{gym.name}</div><div className="text-xs text-gray-400">{gym.city}</div></td>
                  <td className="table-td"><div>{gym.owner_name}</div><div className="text-xs text-gray-400">{gym.phone}</div></td>
                  <td className="table-td"><span className="capitalize font-medium text-primary">{gym.subscription?.plan??'—'}</span></td>
                  <td className="table-td">{gym.subscription?.expiry_date?<span className={gym.subscription.is_expired?'text-red-600 font-medium':''}>{fmtDate(gym.subscription.expiry_date)}</span>:'—'}</td>
                  <td className="table-td font-medium">{gym.total_members}</td>
                  <td className="table-td">
                    {gym.subscription?.is_expired?<span className="badge-expired">Expired</span>:gym.is_active?<span className="badge-active">Active</span>:<span className="badge-inactive">Disabled</span>}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <button onClick={()=>setDetail(gym)} className="text-gray-500 hover:text-primary flex items-center gap-0.5"><Eye className="w-3 h-3"/>View</button>
                      <button onClick={()=>openEdit(gym)} className="text-blue-500 hover:underline flex items-center gap-0.5"><Edit2 className="w-3 h-3"/>Edit</button>
                      <button onClick={()=>{setRenewForm({plan:gym.subscription?.plan||'basic',price_paid:PLAN_PRICE[gym.subscription?.plan||'basic'],start_date:new Date().toISOString().split('T')[0],expiry_date:'',notes:''});setRenew(gym)}} className="text-primary hover:underline flex items-center gap-0.5"><RefreshCw className="w-3 h-3"/>Renew</button>
                      {gym.subscription&&<button onClick={()=>printReceipt(gym)} className="text-purple-600 hover:underline flex items-center gap-0.5"><Printer className="w-3 h-3"/>Receipt</button>}
                      <button onClick={()=>handleToggle(gym)} className={`flex items-center gap-0.5 ${gym.is_active?'text-orange-500':'text-green-600'} hover:underline`}><Power className="w-3 h-3"/>{gym.is_active?'Disable':'Enable'}</button>
                      <button onClick={()=>handleDelete(gym)} className="text-red-500 hover:underline flex items-center gap-0.5"><Trash2 className="w-3 h-3"/>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate&&<Modal title="Add New Gym" onClose={()=>setCreate(false)} wide>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gym Name"><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Fitness Zone"/></Field>
            <Field label="Owner Name"><input className="input" required value={form.owner_name} onChange={e=>setForm({...form,owner_name:e.target.value})}/></Field>
            <Field label="Phone"><input className="input" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="9876543210"/></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
            <Field label="City"><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field>
            <Field label="Owner Password"><input className="input" required type="password" value={form.owner_password} onChange={e=>setForm({...form,owner_password:e.target.value})}/></Field>
          </div>
          <Field label="Address"><input className="input" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
          <Field label="Gym Logo URL"><input className="input" value={form.logo_url} onChange={e=>setForm({...form,logo_url:e.target.value})} placeholder="https://example.com/logo.png"/></Field>
          {form.logo_url && <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"><img src={form.logo_url} alt="Preview" className="w-12 h-12 object-contain rounded border bg-white" onError={e=>{e.target.style.display='none'}}/><span className="text-xs text-gray-400">Logo preview</span></div>}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <Field label="Plan"><select className="input" value={form.plan} onChange={e=>setForm({...form,plan:e.target.value,price_paid:PLAN_PRICE[e.target.value]})}>{PLANS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></Field>
            <Field label="Price (₹)"><input className="input" type="number" required value={form.price_paid} onChange={e=>setForm({...form,price_paid:Number(e.target.value)})}/></Field>
            <Field label="Start Date"><input className="input" type="date" required value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></Field>
          </div>
          <Field label="Expiry Date"><input className="input" type="date" required value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})}/></Field>
          <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setCreate(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Creating…':'Create Gym'}</button></div>
        </form>
      </Modal>}

      {showEdit&&<Modal title={`Edit — ${showEdit.name}`} onClose={()=>setEdit(null)} wide>
        <form onSubmit={handleEdit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gym Name"><input className="input" required value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></Field>
            <Field label="Owner Name"><input className="input" required value={editForm.owner_name} onChange={e=>setEditForm({...editForm,owner_name:e.target.value})}/></Field>
            <Field label="Phone"><input className="input" required value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/></Field>
            <Field label="Email"><input className="input" type="email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})}/></Field>
            <Field label="City"><input className="input" value={editForm.city} onChange={e=>setEditForm({...editForm,city:e.target.value})}/></Field>
          </div>
          <Field label="Address"><input className="input" value={editForm.address} onChange={e=>setEditForm({...editForm,address:e.target.value})}/></Field>
          <Field label="Logo URL"><input className="input" value={editForm.logo_url} onChange={e=>setEditForm({...editForm,logo_url:e.target.value})} placeholder="https://example.com/logo.png"/></Field>
          {editForm.logo_url && <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"><img src={editForm.logo_url} alt="Preview" className="w-12 h-12 object-contain rounded border bg-white" onError={e=>{e.target.style.display='none'}}/><span className="text-xs text-gray-400">Logo preview</span></div>}
          <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setEdit(null)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving…':'Save Changes'}</button></div>
        </form>
      </Modal>}

      {showRenew&&<Modal title={`Renew — ${showRenew.name}`} onClose={()=>setRenew(null)}>
        <form onSubmit={handleRenew} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan"><select className="input" value={renewForm.plan} onChange={e=>setRenewForm({...renewForm,plan:e.target.value,price_paid:PLAN_PRICE[e.target.value]})}>{PLANS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></Field>
            <Field label="Amount (₹)"><input className="input" type="number" value={renewForm.price_paid} onChange={e=>setRenewForm({...renewForm,price_paid:Number(e.target.value)})}/></Field>
            <Field label="Start Date"><input className="input" type="date" required value={renewForm.start_date} onChange={e=>setRenewForm({...renewForm,start_date:e.target.value})}/></Field>
            <Field label="Expiry Date"><input className="input" type="date" required value={renewForm.expiry_date} onChange={e=>setRenewForm({...renewForm,expiry_date:e.target.value})}/></Field>
          </div>
          <Field label="Notes"><input className="input" value={renewForm.notes} placeholder="Optional" onChange={e=>setRenewForm({...renewForm,notes:e.target.value})}/></Field>
          <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setRenew(null)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving…':'Update Subscription'}</button></div>
        </form>
      </Modal>}

      {showDetail&&<Modal title="Gym Details" onClose={()=>setDetail(null)}>
        <div className="space-y-1.5">
          {showDetail.logo_url && (
            <div className="flex justify-center pb-3 border-b border-gray-100">
              <img src={showDetail.logo_url} alt={showDetail.name} className="w-20 h-20 object-contain rounded-xl border border-gray-200 bg-white p-1"/>
            </div>
          )}
          {[['Gym ID',showDetail.id],['Name',showDetail.name],['Owner',showDetail.owner_name],['Phone',showDetail.phone],['Email',showDetail.email],['City',showDetail.city],['Members',showDetail.total_members],['Plan',showDetail.subscription?.plan],['Start',showDetail.subscription?.start_date],['Expiry',showDetail.subscription?.expiry_date],['Status',showDetail.is_active?(showDetail.subscription?.is_expired?'Subscription Expired':'Active'):'Disabled by Admin']].filter(([,v])=>v!=null&&v!=='').map(([k,v])=>(
            <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
              <span className="text-gray-500">{k}</span><span className="font-medium text-right max-w-xs break-all">{String(v)}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-3">
            {showDetail.subscription&&<button onClick={()=>printReceipt(showDetail)} className="btn-primary flex-1 flex items-center justify-center gap-2"><Printer className="w-4 h-4"/>Print Receipt</button>}
            <button onClick={()=>setDetail(null)} className="btn-secondary flex-1">Close</button>
          </div>
        </div>
      </Modal>}
    </div>
  )
}

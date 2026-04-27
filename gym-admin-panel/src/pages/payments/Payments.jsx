import { useEffect, useState, useCallback } from 'react'
import { getPayments, recordPayment, getMembers, getPlans, getGymSettings } from '../../services/api'
import { Plus, Search, Printer, Eye } from 'lucide-react'
import { Modal, Field, Spinner, EmptyState, PageHeader } from '../../components/UI'
import { format, parseISO, addDays } from 'date-fns'
import toast from 'react-hot-toast'

const MODES = ['cash','upi','card','bank_transfer','other']

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

function printPaymentReceipt(payment, memberName, gymName, gymLogo) {
  const amt = parseFloat(payment.amount)
  const amtWords = numberToWords(amt).toUpperCase() + ' ONLY'
  const mode = (payment.mode||'cash').replace('_',' ').toUpperCase()
  const w = window.open('','_blank')
  w.document.write(`<!DOCTYPE html><html><head>
  <title>Receipt — ${payment.receipt_number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;display:flex;justify-content:center;padding:20px}
    .receipt{width:700px;background:#fff;padding:30px 40px}
    .logo-area{text-align:center;margin-bottom:12px}
    .logo-area img{max-height:60px;max-width:200px;object-fit:contain}
    .logo-area h1{font-size:28px;font-weight:900;letter-spacing:2px;margin:0}
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
    .words-row .mode{white-space:nowrap;font-weight:700}
    .sig-row{display:flex;justify-content:space-between;margin-top:50px;font-size:13px}
    .sig-row .left{display:flex;align-items:center;gap:6px}
    .sig-row .line{width:150px;border-bottom:1px solid #333;display:inline-block}
    .sig-row .right{font-weight:700;font-style:italic}
    .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd}
    .footer p{font-size:9px;color:#999;line-height:1.6}
    .footer .brand{font-weight:700;color:#10B981}
    @media print{body{padding:0}.receipt{width:100%;padding:20px 30px}}
  </style></head><body>
  <div class="receipt">
    <div class="logo-area">
      ${gymLogo ? `<img src="${gymLogo}" alt="Logo" onerror="this.style.display='none'"/>` : `<h1>${gymName||'FitNexus'}</h1>`}
      ${gymLogo ? `<h1 style="font-size:20px;margin-top:4px">${gymName||'FitNexus'}</h1>` : ''}
    </div>
    <hr class="divider"/>
    <div class="info-row"><span><b>Receipt No.</b> &nbsp;${payment.receipt_number}</span><span><b>Date:</b> &nbsp;${payment.payment_date}</span></div>
    <div class="info-row"><span><b>Mrs./Miss./Mr.</b> &nbsp;${memberName||'—'}</span><span><b>Mode:</b> &nbsp;${mode}</span></div>
    <hr class="divider-thin"/>
    <table class="txn">
      <thead><tr><th style="width:50px">Sr.No.</th><th>Plan / Type</th><th>Date of Transaction</th><th style="width:120px;text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${payment.membership_plan_name||mode}</td>
          <td>${payment.valid_from && payment.valid_to ? `From &nbsp;${payment.valid_from}&nbsp; to &nbsp;${payment.valid_to}` : payment.payment_date}</td>
          <td class="amt">${amt.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        </tr>
        ${payment.notes ? `<tr><td></td><td colspan="2" style="color:#888;font-size:11px">Notes: ${payment.notes}</td><td></td></tr>` : ''}
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
      <span class="mode">By ${mode.toLowerCase().replace(/\b\w/g,l=>l.toUpperCase())}.</span>
    </div>
    <div class="sig-row">
      <div class="left"><b>Received by</b><span class="line"></span></div>
      <div class="right">Receiver's Signature</div>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt</p>
      <p>Generated on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; <span class="brand">Powered by FitNexus</span></p>
    </div>
  </div>
  <script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}

export default function Payments() {
  const [payments,setPayments]=useState([])
  const [members,setMembers]=useState([])
  const [plans,setPlans]=useState([])
  const [gymName,setGymName]=useState('')
  const [gymLogo,setGymLogo]=useState('')
  const [loading,setLoading]=useState(true)
  const [showAdd,setAdd]=useState(false)
  const [saving,setSaving]=useState(false)
  const [search,setSearch]=useState('')
  const [viewReceipt,setViewReceipt]=useState(null)
  const emptyForm={member_id:'',membership_plan_id:'',amount:'',payment_date:new Date().toISOString().split('T')[0],mode:'cash',notes:'',valid_from:new Date().toISOString().split('T')[0],valid_to:''}
  const [form,setForm]=useState(emptyForm)

  const load=useCallback(async()=>{
    setLoading(true)
    try{const{data}=await getPayments();setPayments(data)}
    catch{toast.error('Failed to load payments')}
    finally{setLoading(false)}
  },[])

  useEffect(()=>{load()},[load])
  useEffect(()=>{
    getMembers({is_active:true}).then(r=>setMembers(r.data)).catch(()=>{})
    getPlans().then(r=>setPlans(r.data)).catch(()=>{})
    getGymSettings().then(r=>{setGymName(r.data?.name||'');setGymLogo(r.data?.logo_url||'')}).catch(()=>{})
  },[])

  const handleRecord=async(e)=>{
    e.preventDefault()
    if(!form.member_id)return toast.error('Select a member')
    if(!form.amount||Number(form.amount)<=0)return toast.error('Enter a valid amount')
    setSaving(true)
    try{
      const payload={
        member_id:form.member_id,
        amount:Number(form.amount),
        payment_date:form.payment_date,
        mode:form.mode,
        notes:form.notes||null,
        valid_from:form.valid_from||null,
        valid_to:form.valid_to||null,
        membership_plan_id:form.membership_plan_id||null,
      }
      await recordPayment(payload)
      toast.success('Payment recorded!')
      setAdd(false);setForm(emptyForm);load()
    }catch(err){
      const detail=err.response?.data?.detail
      toast.error(detail||'Failed to record payment. Check all fields.')
      console.error('Payment error:',err.response?.data)
    }finally{setSaving(false)}
  }

  const filtered=payments.filter(p=>{
    if(!search)return true
    const m=members.find(m=>m.id===p.member_id)
    return m?.name?.toLowerCase().includes(search.toLowerCase())||p.receipt_number?.toLowerCase().includes(search.toLowerCase())
  })

  const totalRevenue=payments.reduce((s,p)=>s+parseFloat(p.amount||0),0)
  const fmtDate=s=>{try{return format(parseISO(s),'dd MMM yyyy')}catch{return s||'—'}}
  const getMemberName=id=>members.find(m=>m.id===id)?.name||'—'
  const modeColors={cash:'badge-active',upi:'badge-info',card:'badge-info',bank_transfer:'badge-warning',other:'badge-warning'}

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader title="Payments" sub={`Total collected: ₹${Math.round(totalRevenue).toLocaleString()}`}>
        <button onClick={()=>setAdd(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4"/>Record Payment</button>
      </PageHeader>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input className="input pl-9 max-w-sm" placeholder="Search by member or receipt…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="card overflow-hidden">
        {loading?<Spinner/>:filtered.length===0?(
          <EmptyState icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>}
            title="No payments yet" sub="Record your first payment"
            action={<button onClick={()=>setAdd(true)} className="btn-primary">Record Payment</button>}/>
        ):(
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="th">Member</th><th className="th">Amount</th><th className="th">Date</th>
                <th className="th">Mode</th><th className="th">Valid Till</th><th className="th">Receipt No</th><th className="th">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p=>(
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="td font-medium">{getMemberName(p.member_id)}</td>
                    <td className="td font-semibold text-primary">₹{parseFloat(p.amount).toLocaleString()}</td>
                    <td className="td text-gray-500">{fmtDate(p.payment_date)}</td>
                    <td className="td"><span className={modeColors[p.mode]||'badge-info'}>{p.mode?.toUpperCase()}</span></td>
                    <td className="td text-gray-500">{fmtDate(p.valid_to)}</td>
                    <td className="td text-xs text-gray-400 font-mono">{p.receipt_number}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setViewReceipt(p)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary">
                          <Eye className="w-3 h-3"/>View
                        </button>
                        <button onClick={()=>printPaymentReceipt(p,getMemberName(p.member_id),gymName,gymLogo)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                          <Printer className="w-3 h-3"/>Print
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

      {/* Record Payment Modal */}
      {showAdd&&<Modal title="Record Payment" onClose={()=>setAdd(false)}>
        <form onSubmit={handleRecord} className="space-y-3">
          <Field label="Member *">
            <select className="input" required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value})}>
              <option value="">Select member…</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name} — {m.phone}</option>)}
            </select>
          </Field>
          <Field label="Membership Plan">
            <select className="input" value={form.membership_plan_id} onChange={e=>{
              const p=plans.find(pl=>pl.id===e.target.value)
              const today=new Date().toISOString().split('T')[0]
              setForm({...form,membership_plan_id:e.target.value,
                amount:p?String(p.price):form.amount,
                valid_from:today,
                valid_to:p?format(addDays(new Date(),p.duration_days),'yyyy-MM-dd'):form.valid_to})
            }}>
              <option value="">Select plan (optional)</option>
              {plans.map(p=><option key={p.id} value={p.id}>{p.name} — ₹{p.price} / {p.duration_days} days</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹) *"><input className="input" type="number" required min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></Field>
            <Field label="Payment Mode">
              <select className="input" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}>
                {MODES.map(m=><option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Payment Date"><input className="input" type="date" value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></Field>
            <Field label="Valid From"><input className="input" type="date" value={form.valid_from} onChange={e=>setForm({...form,valid_from:e.target.value})}/></Field>
          </div>
          <Field label="Valid To (Plan Expiry)"><input className="input" type="date" value={form.valid_to} onChange={e=>setForm({...form,valid_to:e.target.value})}/></Field>
          <Field label="Notes"><input className="input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional"/></Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={()=>setAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Recording…':'Record Payment'}</button>
          </div>
        </form>
      </Modal>}

      {/* View Receipt Modal */}
      {viewReceipt&&<Modal title="Payment Receipt" onClose={()=>setViewReceipt(null)}>
        <div className="space-y-2">
          <div className="text-center py-3 bg-primary/5 rounded-xl mb-4">
            <p className="text-3xl font-bold text-primary">₹{parseFloat(viewReceipt.amount).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{viewReceipt.receipt_number}</p>
          </div>
          {[
            ['Member',getMemberName(viewReceipt.member_id)],
            ['Payment Date',fmtDate(viewReceipt.payment_date)],
            ['Mode',viewReceipt.mode?.toUpperCase()],
            ['Valid From',fmtDate(viewReceipt.valid_from)],
            ['Valid To',fmtDate(viewReceipt.valid_to)],
            ['Notes',viewReceipt.notes],
          ].filter(([,v])=>v&&v!=='—').map(([k,v])=>(
            <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
              <span className="text-gray-500">{k}</span><span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-3">
            <button onClick={()=>printPaymentReceipt(viewReceipt,getMemberName(viewReceipt.member_id),gymName,gymLogo)}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/>Print Receipt
            </button>
            <button onClick={()=>setViewReceipt(null)} className="btn-secondary flex-1">Close</button>
          </div>
        </div>
      </Modal>}
    </div>
  )
}

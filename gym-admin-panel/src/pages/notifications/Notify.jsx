import { useEffect, useState } from 'react'
import { sendBulk, getMembers } from '../../services/api'
import { Bell, Send, Users, UserCheck } from 'lucide-react'
import { Field, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'

const CHANNEL_OPTIONS = [
  { key: 'sms',       label: 'SMS',       icon: '📱', desc: 'via 2Factor.in' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬', desc: 'via 2Factor.in' },
  { key: 'push',      label: 'Push',      icon: '🔔', desc: 'via Firebase FCM' },
]

const TEMPLATES = [
  { label: 'Plan expiry reminder', title: 'Membership Expiring Soon', message: 'Dear member, your gym membership is expiring soon. Please visit the gym to renew and continue your fitness journey!' },
  { label: 'Payment due',          title: 'Payment Reminder',         message: 'Dear member, your membership fee is due. Please visit the gym or contact us to make the payment.' },
  { label: 'Holiday notice',       title: 'Gym Holiday Notice',       message: 'Dear member, the gym will be closed tomorrow. We apologize for the inconvenience.' },
  { label: 'New batch starting',   title: 'New Batch Starting',       message: 'Dear member, a new batch is starting soon. Contact us for more details and early registration.' },
  { label: 'Custom message',       title: '',                          message: '' },
]

export default function Notify() {
  const [members,   setMembers]   = useState([])
  const [title,     setTitle]     = useState('')
  const [message,   setMessage]   = useState('')
  const [channels,  setChannels]  = useState(['sms', 'whatsapp', 'push'])
  const [audience,  setAudience]  = useState('all')
  const [selIds,    setSelIds]    = useState([])
  const [template,  setTemplate]  = useState(0)
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState(null)

  useEffect(() => {
    getMembers({ is_active: true }).then(r => setMembers(r.data)).catch(() => {})
  }, [])

  function pickTemplate(i) {
    setTemplate(i)
    setTitle(TEMPLATES[i].title)
    setMessage(TEMPLATES[i].message)
  }

  function toggleChannel(key) {
    setChannels(c => c.includes(key) ? c.filter(k => k !== key) : [...c, key])
  }

  function toggleMember(id) {
    setSelIds(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return toast.error('Enter title and message')
    if (channels.length === 0) return toast.error('Select at least one channel')
    if (audience === 'selected' && selIds.length === 0) return toast.error('Select at least one member')
    setSending(true); setResult(null)
    try {
      const payload = {
        title, message, channels,
        member_ids: audience === 'selected' ? selIds : null,
      }
      const { data } = await sendBulk(payload)
      setResult(data)
      toast.success(`Sent to ${data.success} of ${data.total} members!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
    } finally { setSending(false) }
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Send Notification" sub="Reach your members via SMS, WhatsApp or Push"/>

      <form onSubmit={handleSend} className="space-y-5">

        {/* Templates */}
        <div className="card p-5">
          <p className="font-semibold text-gray-900 mb-3">Quick templates</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t, i) => (
              <button key={i} type="button" onClick={() => pickTemplate(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${template === i ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="card p-5 space-y-3">
          <p className="font-semibold text-gray-900">Message</p>
          <Field label="Title" required>
            <input className="input" required value={title}
              onChange={e => setTitle(e.target.value)} placeholder="e.g. Membership Expiring Soon"/>
          </Field>
          <Field label="Message" required>
            <textarea className="input resize-none" rows={4} required value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message here…"/>
            <p className="text-xs text-gray-400 mt-1">{message.length} characters</p>
          </Field>
        </div>

        {/* Channels */}
        <div className="card p-5">
          <p className="font-semibold text-gray-900 mb-3">Send via</p>
          <div className="grid grid-cols-3 gap-3">
            {CHANNEL_OPTIONS.map(ch => (
              <button key={ch.key} type="button" onClick={() => toggleChannel(ch.key)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all
                  ${channels.includes(ch.key) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className="text-2xl">{ch.icon}</span>
                <span className="font-medium text-sm">{ch.label}</span>
                <span className="text-xs text-gray-400">{ch.desc}</span>
              </button>
            ))}
          </div>
          {channels.length === 0 && (
            <p className="text-xs text-red-500 mt-2">Select at least one channel</p>
          )}
        </div>

        {/* Audience */}
        <div className="card p-5">
          <p className="font-semibold text-gray-900 mb-3">Send to</p>
          <div className="flex gap-3 mb-4">
            <button type="button" onClick={() => setAudience('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                ${audience==='all' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Users className="w-4 h-4"/> All members ({members.length})
            </button>
            <button type="button" onClick={() => setAudience('selected')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                ${audience==='selected' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <UserCheck className="w-4 h-4"/> Select members
            </button>
          </div>

          {audience === 'selected' && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {members.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active members</p>
              ) : members.map(m => (
                <label key={m.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                    ${selIds.includes(m.id) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selIds.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="w-4 h-4 text-primary rounded accent-primary"/>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.phone}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {audience === 'selected' && selIds.length > 0 && (
            <p className="text-xs text-primary mt-2 font-medium">{selIds.length} member{selIds.length > 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            <Bell className="w-4 h-4 flex-shrink-0"/>
            Sent to <strong>{result.success}</strong> members.
            {result.failed > 0 && <span className="text-red-600 ml-1">({result.failed} failed)</span>}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={sending}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
          {sending
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>&nbsp;Sending…</>
            : <><Send className="w-4 h-4"/> Send Notification</>
          }
        </button>
      </form>
    </div>
  )
}

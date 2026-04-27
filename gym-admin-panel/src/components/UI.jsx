export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} my-4`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  )
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-3">{icon}</div>
      <p className="font-semibold text-gray-700 text-lg mb-1">{title}</p>
      {sub && <p className="text-gray-400 text-sm mb-4">{sub}</p>}
      {action}
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'text-primary', icon }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      {icon && <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">{icon}</div>}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

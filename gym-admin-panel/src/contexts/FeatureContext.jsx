import { createContext, useContext, useEffect, useState } from 'react'
import { getFeatures } from '../services/api'
import { Lock, Sparkles } from 'lucide-react'

const FeatureCtx = createContext({
  plan: 'basic',
  features: {},
  labels: {},
  upgradeMap: {},
  loading: true,
  can: () => false,
})

export function FeatureProvider({ children }) {
  const [state, setState] = useState({
    plan: 'basic',
    features: {},
    labels: {},
    upgradeMap: {},
    loading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('gym_token')
    if (!token) { setState(s => ({...s, loading: false})); return }

    getFeatures()
      .then(r => setState({
        plan: r.data.plan,
        features: r.data.features,
        labels: r.data.labels,
        upgradeMap: r.data.upgrade_map,
        loading: false,
      }))
      .catch(() => setState(s => ({...s, loading: false})))
  }, [])

  const can = (feature) => state.features[feature] === true

  return (
    <FeatureCtx.Provider value={{...state, can}}>
      {children}
    </FeatureCtx.Provider>
  )
}

/**
 * Hook to check feature access
 * Usage: const { can, plan } = useFeature()
 *        if (!can('workout_plans')) ...
 */
export function useFeature() {
  return useContext(FeatureCtx)
}

/**
 * Wrapper that shows content if feature is enabled,
 * otherwise shows an upgrade prompt card.
 *
 * Usage:
 *   <FeatureGate feature="workout_plans">
 *     <Workout />
 *   </FeatureGate>
 */
export function FeatureGate({ feature, children }) {
  const { can, plan, labels, upgradeMap, loading } = useContext(FeatureCtx)

  if (loading) return null
  if (can(feature)) return children

  const label = labels[feature] || feature.replace(/_/g, ' ')
  const requiredPlan = upgradeMap[feature] || 'pro'

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {label} is a {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} feature
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Your gym is currently on the <span className="font-semibold capitalize">{plan}</span> plan.
          Upgrade to <span className="font-semibold capitalize">{requiredPlan}</span> to unlock {label.toLowerCase()}.
        </p>
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 text-left mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">
              What you get with {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
            </span>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Workout & Diet Plans</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Body Measurements Tracking</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> SMS Notifications</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Advanced Reports</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Staff & Trainer Management</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Unlimited Members & Staff</li>
            <li className="flex items-center gap-2"><span className="text-primary">✓</span> Member App: Workout, Diet & Body Charts</li>
          </ul>
        </div>
        <a href="mailto:support@fitnexus.in?subject=Upgrade%20to%20Pro"
          className="btn-primary inline-flex items-center gap-2 px-8 py-3">
          <Sparkles className="w-4 h-4" /> Contact to Upgrade
        </a>
      </div>
    </div>
  )
}

/**
 * Inline badge to show on sidebar nav items that are locked.
 * Usage: {!can('workout_plans') && <ProBadge />}
 */
export function ProBadge({ plan = 'PRO' }) {
  return (
    <span className="ml-auto text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">
      {plan}
    </span>
  )
}

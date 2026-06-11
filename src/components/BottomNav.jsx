import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Map, Package, Wallet, MoreHorizontal, AlertTriangle, Users, Settings, Bell, X } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/trip', icon: CalendarDays, key: 'nav.trip', matchPrefix: '/trip' },
  { to: '/trip/map',      icon: Map,     key: 'nav.map'      },
  { to: '/trip/packing',  icon: Package, key: 'nav.packing'  },
  { to: '/trip/expenses', icon: Wallet,  key: 'nav.expenses' },
]

const MORE_ITEMS = [
  { to: '/trip/notifications', icon: Bell, key: 'nav.notifications' },
  { to: '/trip/emergency', icon: AlertTriangle, key: 'nav.emergency' },
  { to: '/trip/members',   icon: Users,         key: 'nav.members'   },
  { to: '/trip/settings',  icon: Settings,      key: 'nav.settings'  },
]

const MORE_PATHS = MORE_ITEMS.map(i => i.to)
// Paths that belong exclusively to their own NAV_ITEMS tab (not "行程")
const OWN_NAV_PATHS = ['/trip/map', '/trip/packing', '/trip/expenses']

export default function BottomNav() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)

  const p = location.pathname
  const isMoreActive = MORE_PATHS.some(mp => p === mp || p.startsWith(mp + '/'))
  const isOwnNavActive = OWN_NAV_PATHS.some(op => p === op || p.startsWith(op + '/'))

  const isTripActive = !isMoreActive && !isOwnNavActive && (
    p === '/trip' || p.startsWith('/trip/activities') || p.startsWith('/trip/flights') || p.startsWith('/trip/hotels')
  )

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div
            className="glass-card absolute right-2 py-2 min-w-[160px]"
            style={{ bottom: 'calc(5.75rem)' }}
            onClick={e => e.stopPropagation()}
          >
            {MORE_ITEMS.map(({ to, icon: Icon, key }) => (
              <button
                key={to}
                onClick={() => { navigate(to); setShowMore(false) }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left"
                style={{ color: 'var(--text-primary)' }}
              >
                <Icon size={20} />
                <span className="text-base">{t(key)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="glass-mini fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 mx-2 mb-2">
        {NAV_ITEMS.map(({ to, icon: Icon, key, matchPrefix }) => {
          const isActive = matchPrefix
            ? isTripActive
            : !isMoreActive && (location.pathname === to || location.pathname.startsWith(to + '/'))

          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-subtle, rgba(var(--accent-rgb, 13 148 136) / 0.12))' : 'transparent',
              }}
            >
              <Icon size={22} />
              <span className="text-xs">{t(key)}</span>
            </button>
          )
        })}

        <button
          onClick={() => setShowMore(s => !s)}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors"
          style={{
            color: (showMore || isMoreActive) ? 'var(--accent)' : 'var(--text-secondary)',
            background: (showMore || isMoreActive) ? 'var(--accent-subtle, rgba(var(--accent-rgb, 13 148 136) / 0.12))' : 'transparent',
          }}
        >
          {showMore ? <X size={22} /> : <MoreHorizontal size={22} />}
          <span className="text-xs">{t('nav.more')}</span>
        </button>
      </nav>
    </>
  )
}

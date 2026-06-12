import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { House, CalendarDays, Luggage, Package, Wallet, MoreHorizontal, AlertTriangle, Users, Settings, Bell, Map, X } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/trip',            icon: House,        key: 'nav.trip',       exact: true },
  { to: '/trip/activities', icon: CalendarDays, key: 'nav.activities'              },
  { to: '/trip/travel',     icon: Luggage,      key: 'nav.travel'                  },
  { to: '/trip/packing',    icon: Package,      key: 'nav.packing'                 },
  { to: '/trip/expenses',   icon: Wallet,       key: 'nav.expenses'                },
]

const MORE_ITEMS = [
  { to: '/trip/map',           icon: Map,           key: 'nav.map'           },
  { to: '/trip/notifications', icon: Bell,          key: 'nav.notifications' },
  { to: '/trip/members',       icon: Users,         key: 'nav.members'       },
  { to: '/trip/emergency',     icon: AlertTriangle, key: 'nav.emergency'     },
  { to: '/trip/settings',      icon: Settings,      key: 'nav.settings'      },
]

const MORE_PATHS = MORE_ITEMS.map(i => i.to)

export default function BottomNav() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)

  const p = location.pathname
  const isMoreActive = MORE_PATHS.some(mp => p === mp || p.startsWith(mp + '/')) &&
    !NAV_ITEMS.some(({ to, exact }) => exact ? p === to : (p === to || p.startsWith(to + '/')))

  const activeStyle = (active) => ({
    color:      active ? 'var(--accent)' : 'var(--text-secondary)',
    background: active ? 'var(--accent-subtle, rgba(13 148 136 / 0.12))' : 'transparent',
  })

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
                style={{ color: 'var(--text-primary)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Icon size={20} />
                <span className="text-base">{t(key)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* upward fade mask above nav */}
      <div
        style={{
          position: 'fixed',
          bottom: 76,
          left: 0,
          right: 0,
          height: 72,
          background: 'linear-gradient(to bottom, transparent, var(--bg-to))',
          pointerEvents: 'none',
          zIndex: 49,
        }}
      />

      <nav className="glass-mini fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 mx-2 mb-2">
        {NAV_ITEMS.map(({ to, icon: Icon, key, exact }) => {
          const active = exact ? p === to : (p === to || p.startsWith(to + '/'))
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors"
              style={activeStyle(active)}
            >
              <Icon size={22} />
              <span className="text-xs">{t(key)}</span>
            </button>
          )
        })}

        <button
          onClick={() => setShowMore(s => !s)}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors"
          style={activeStyle(showMore || isMoreActive)}
        >
          {showMore ? <X size={22} /> : <MoreHorizontal size={22} />}
          <span className="text-xs">{t('nav.more')}</span>
        </button>
      </nav>
    </>
  )
}

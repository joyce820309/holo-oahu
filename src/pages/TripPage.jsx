import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const TABS = [
  { to: '/trip',             label: { zh: '總覽', en: 'Overview' },  end: true },
  { to: '/trip/activities',  label: { zh: '活動', en: 'Activities' } },
  { to: '/trip/flights',     label: { zh: '機票', en: 'Flights' } },
  { to: '/trip/hotels',      label: { zh: '住宿', en: 'Hotels' } },
]

export default function TripPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div>
      {/* Sub-nav tabs */}
      <div className="flex overflow-x-auto gap-1 px-4 pt-3 pb-1 no-scrollbar">
        {TABS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'glass-mini text-secondary'
              }`
            }
            style={({ isActive }) => isActive ? { background: 'var(--accent)', color: 'white' } : {}}
          >
            {lang === 'zh-TW' ? label.zh : label.en}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}

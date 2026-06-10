import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, UtensilsCrossed, Ticket, Waves, Star, MapPin, Trash2, Pencil, Car, Bus, Footprints, Truck, EllipsisVertical, MapPinned } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import ConfirmDialog from '../components/ConfirmDialog'
import { ActivitiesSkeleton } from '../components/Skeleton'

const ACTION_WIDTH = 128
const SWIPE_THRESHOLD = 48

const TYPE_ICONS = {
  restaurant: UtensilsCrossed,
  attraction: Ticket,
  beach:      Waves,
  experience: Star,
  other:      MapPin,
}

const TRANSPORT_ICONS = {
  car:     Car,
  bus:     Bus,
  taxi:    Car,
  walk:    Footprints,
  shuttle: Truck,
}

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

function SwipeableCard({ children, onDelete, onEdit }) {
  const [offset, setOffset] = useState(0)
  const [open, setOpen]     = useState(false)
  const startX   = useRef(null)
  const startY   = useRef(null)
  const dragging = useRef(false)
  const wrapRef  = useRef(null)
  const innerRef = useRef(null)

  const close = useCallback(() => { setOffset(0); setOpen(false) }, [])

  useEffect(() => {
    if (!open) return
    const h = e => { if (!wrapRef.current?.contains(e.target)) close() }
    document.addEventListener('touchstart', h, { passive: true })
    document.addEventListener('mousedown', h)
    return () => { document.removeEventListener('touchstart', h); document.removeEventListener('mousedown', h) }
  }, [open, close])

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const onStart = e => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; dragging.current = false }
    const onMove  = e => {
      if (startX.current === null) return
      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current
      if (!dragging.current) {
        if (Math.abs(dy) > Math.abs(dx)) { startX.current = null; return }
        dragging.current = true
      }
      e.preventDefault()
      const base = open ? -ACTION_WIDTH : 0
      setOffset(Math.min(0, Math.max(-ACTION_WIDTH, base + dx)))
    }
    const onEnd = () => {
      if (!dragging.current) return
      setOffset(prev => { const s = prev < -SWIPE_THRESHOLD ? -ACTION_WIDTH : 0; setOpen(s !== 0); return s })
      startX.current = null; dragging.current = false
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd) }
  }, [open])

  return (
    // outer: clips the sliding card but NOT the action buttons
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
      {/* sliding card */}
      <div
        ref={innerRef}
        style={{ flex: 1, minWidth: 0, transform: `translateX(${offset}px)`, transition: 'transform 0.25s ease', willChange: 'transform', zIndex: 1 }}
      >
        {children}
      </div>

      {/* action buttons — sit to the right, revealed by sliding */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: ACTION_WIDTH, display: 'flex',
        transform: `translateX(${ACTION_WIDTH + offset}px)`,
        transition: 'transform 0.25s ease',
        zIndex: 0,
      }}>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); close(); onEdit() }}
          style={{ flex: 1, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, borderRadius: '12px 0 0 12px' }}
        >
          <Pencil size={16} />編輯
        </button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); close(); onDelete() }}
          style={{ flex: 1, background: '#e05555', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, borderRadius: '0 12px 12px 0' }}
        >
          <Trash2 size={16} />刪除
        </button>
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  const { t, i18n }  = useTranslation()
  const { activities, loading, deleteActivity } = useActivities()
  const navigate = useNavigate()
  const [delId, setDelId] = useState(null)
  const lang = i18n.language

  const byDate = activities.reduce((acc, a) => {
    acc[a.date] = acc[a.date] || []
    acc[a.date].push(a)
    return acc
  }, {})

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('activities.title')}</h2>
        <Link to="/trip/activities/new" className="btn-primary">
          <Plus size={18} />{t('activities.new')}
        </Link>
      </div>

      {loading && <ActivitiesSkeleton />}
      {!loading && activities.length === 0 && (
        <p className="text-secondary text-center py-8">{t('activities.noData')}</p>
      )}

      {Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, items]) => {
        const sorted = [...items].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
        return (
          <div key={date} className="mb-8">
            <p className="text-secondary text-sm mb-3 font-medium">{date}</p>

            {/* Timeline */}
            <div className="relative">
              {/* vertical line */}
              <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, background: 'var(--mini-border)', zIndex: 0 }} />

              {sorted.map((activity, idx) => {
                const Icon     = TYPE_ICONS[activity.type] || MapPin
                const hasTransport = activity.transportAfter?.mode && activity.transportAfter.mode !== 'none'
                const TransIcon    = hasTransport && TRANSPORT_ICONS[activity.transportAfter.mode]

                const card = (isDesktop) => (
                  <div
                    className="glass-card p-4 cursor-pointer"
                    onClick={() => navigate(`/trip/activities/${activity.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg glass-mini flex-shrink-0">
                        <Icon size={18} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary font-medium text-base leading-snug">{bi(activity.title, lang)}</p>
                        {bi(activity.location, lang) && <p className="text-secondary text-sm mt-0.5">{bi(activity.location, lang)}</p>}
                        {activity.startTime && (
                          <p className="text-secondary text-xs mt-1">
                            {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {(bi(activity.address, lang) || (activity.lat && activity.lng)) && (
                          <button
                            className="p-1.5 rounded-lg"
                            style={{ minWidth: 32, minHeight: 32, color: 'var(--accent)' }}
                            onClick={e => {
                              e.stopPropagation()
                              const q = activity.lat && activity.lng
                                ? `${activity.lat},${activity.lng}`
                                : encodeURIComponent(bi(activity.address, lang))
                              window.open(`https://maps.google.com/?q=${q}`)
                            }}
                          >
                            <MapPinned size={15} />
                          </button>
                        )}
                        {isDesktop && (
                          <button className="p-1.5 rounded-lg" style={{ minWidth: 32, minHeight: 32, color: 'var(--text-secondary)' }}
                            onClick={e => { e.stopPropagation(); setDelId(activity.id) }}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )

                return (
                  <div key={activity.id}>
                    {/* Row: dot + time + card */}
                    <div className="flex items-start gap-3 relative" style={{ zIndex: 1 }}>
                      {/* Left: number dot + time */}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 40 }}>
                        <div className="flex items-center justify-center rounded-full text-white text-xs font-bold"
                          style={{ width: 24, height: 24, background: 'var(--accent)', flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        {activity.startTime && (
                          <span className="text-secondary mt-1" style={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}>
                            {activity.startTime}
                          </span>
                        )}
                      </div>

                      {/* Card */}
                      <div className="flex-1 min-w-0">
                        <div className="md:hidden">
                          <SwipeableCard
                            onDelete={() => setDelId(activity.id)}
                            onEdit={() => navigate(`/trip/activities/${activity.id}/edit`)}
                          >
                            {card(false)}
                          </SwipeableCard>
                        </div>
                        <div className="hidden md:block">{card(true)}</div>
                      </div>
                    </div>

                    {/* Transport connector — always show between cards */}
                    {idx < sorted.length - 1 && (
                      <div className="flex items-center gap-3 my-1" style={{ zIndex: 1, position: 'relative' }}>
                        <div style={{ width: 40, flexShrink: 0 }} />
                        {hasTransport ? (
                          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)' }}>
                            {TransIcon && <TransIcon size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                            <span className="text-secondary flex-1" style={{ fontSize: 12 }}>
                              {t(`activities.transport.mode.${activity.transportAfter.mode}`)}
                              {activity.transportAfter.durationMin > 0 && ` · ${activity.transportAfter.durationMin} ${t('activities.transport.duration')}`}
                              {bi(activity.transportAfter.note, lang) && ` · ${bi(activity.transportAfter.note, lang)}`}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${activity.id}/transport`) }}
                              style={{ color: 'var(--text-secondary)', padding: 4, flexShrink: 0 }}
                            >
                              <EllipsisVertical size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl"
                            style={{ border: '0.5px dashed var(--mini-border)', color: 'var(--text-secondary)', fontSize: 12, background: 'transparent' }}
                            onClick={() => navigate(`/trip/activities/${activity.id}/transport`)}
                          >
                            <Plus size={12} />
                            設定交通
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteActivity(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}

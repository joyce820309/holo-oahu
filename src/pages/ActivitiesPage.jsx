import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, UtensilsCrossed, Ticket, Waves, Star, MapPin, Trash2, Pencil,
  Car, Bus, Footprints, Truck, EllipsisVertical, MapPinned,
  Plane, ArrowLeftRight, RotateCcw, GripVertical, Check,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useActivities } from '../hooks/useActivities'
import ConfirmDialog from '../components/ConfirmDialog'
import { ActivitiesSkeleton } from '../components/Skeleton'

const TRIP_START = '2026-07-18'
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

// Day N label from date string
function dayLabel(dateStr) {
  const start = new Date(TRIP_START)
  const cur   = new Date(dateStr)
  const diff  = Math.round((cur - start) / 86400000)
  const d = cur.getMonth() + 1 + '/' + cur.getDate()
  return { n: diff + 1, d }
}

// ── Context menu (⋮) — portal-based to avoid overflow clipping ───────────
function CardMenu({ onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)

  const openMenu = e => {
    e.stopPropagation()
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = e => {
      if (!btnRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close, { passive: true })
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close) }
  }, [open])

  const items = [
    { label: '查看詳情', Icon: MapPinned, action: onView },
    { label: '編輯',     Icon: Pencil,   action: onEdit  },
    { label: '刪除',     Icon: Trash2,   action: onDelete, danger: true },
  ]

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        style={{ padding: 6, color: 'var(--text-secondary)', minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, flexShrink: 0 }}
        aria-label="更多選項"
      >
        <EllipsisVertical size={16} />
      </button>

      {open && createPortal(
        <div
          style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999,
            background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid var(--glass-border)', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)', minWidth: 128, overflow: 'hidden',
          }}
        >
          {items.map(({ label, Icon, action, danger }) => (
            <button
              key={label}
              onClick={e => { e.stopPropagation(); setOpen(false); action() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', fontSize: 14, textAlign: 'left', background: 'none', border: 'none',
                color: danger ? '#e05555' : 'var(--text-primary)', cursor: 'pointer',
              }}
            >
              <Icon size={15} />{label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// ── Swipeable card (normal mode, mobile) ──────────────────────────────────
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
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
      <div ref={innerRef} style={{ flex: 1, minWidth: 0, transform: `translateX(${offset}px)`, transition: 'transform 0.25s ease', willChange: 'transform', zIndex: 1 }}>
        {children}
      </div>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: ACTION_WIDTH, display: 'flex', transform: `translateX(${ACTION_WIDTH + offset}px)`, transition: 'transform 0.25s ease', zIndex: 0 }}>
        <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); close(); onEdit() }}
          style={{ flex: 1, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, borderRadius: '12px 0 0 12px' }}>
          <Pencil size={16} />編輯
        </button>
        <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); close(); onDelete() }}
          style={{ flex: 1, background: '#e05555', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, borderRadius: '0 12px 12px 0' }}>
          <Trash2 size={16} />刪除
        </button>
      </div>
    </div>
  )
}

// ── Sortable item wrapper (edit mode) ──────────────────────────────────────
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 50 : 1 }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

// ── Activity card ──────────────────────────────────────────────────────────
function ActivityCard({ activity, lang, editMode, dragHandleProps, onMapOpen, onEdit, onDelete, onView }) {
  const isFlight = !!activity.flightId
  const Icon     = isFlight ? Plane : (TYPE_ICONS[activity.type] || MapPin)
  const crossDay = activity.startTime && activity.endTime && activity.endTime < activity.startTime

  const flightStyle = isFlight ? {
    background: 'color-mix(in srgb, var(--accent) 6%, var(--glass-bg))',
    border: '1px dashed color-mix(in srgb, var(--accent) 40%, transparent)',
  } : {}

  return (
    <div className="glass-card p-4" style={{ ...flightStyle }}>
      <div className="flex items-start gap-3">
        {editMode && (
          <button
            {...dragHandleProps}
            className="mt-1 flex-shrink-0 touch-none"
            style={{ color: 'var(--text-secondary)', cursor: 'grab', padding: 4, minWidth: 32, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="拖拉排序"
          >
            <GripVertical size={18} />
          </button>
        )}
        <div className="mt-0.5 p-2 rounded-lg flex-shrink-0"
          style={{ background: isFlight ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--mini-bg)' }}>
          <Icon size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-primary font-medium text-base leading-snug">{bi(activity.title, lang)}</p>
          {bi(activity.location, lang) && <p className="text-secondary text-sm mt-0.5">{bi(activity.location, lang)}</p>}
          {activity.startTime && (
            <p className="text-secondary text-xs mt-1">
              {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}
              {crossDay && <span style={{ marginLeft: 4, color: 'var(--accent)', fontWeight: 500 }}>+1</span>}
            </p>
          )}
        </div>
        {!editMode && (
          <CardMenu onView={onView} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </div>
  )
}

// ── Date group ─────────────────────────────────────────────────────────────
function DateGroup({ date, items, editMode, lang, navigate, setDelId, onReorder }) {
  const { t } = useTranslation()
  const [localItems, setLocalItems] = useState(items)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => { setLocalItems(items) }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const segments = new Set(items.map(a => a.segmentId).filter(Boolean))
  const isTransit = segments.has('transit')
  const isReturn  = segments.has('return')
  const activeItem = activeId ? localItems.find(a => a.id === activeId) : null

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIdx = localItems.findIndex(a => a.id === active.id)
    const newIdx = localItems.findIndex(a => a.id === over.id)
    const next = arrayMove(localItems, oldIdx, newIdx)
    setLocalItems(next)
    onReorder(next)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-secondary text-sm font-medium">{date}</p>
        {isTransit && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#b45309', border: '0.5px solid #f59e0b55' }}>
            <ArrowLeftRight size={10} />轉機
          </span>
        )}
        {isReturn && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#6d28d9', border: '0.5px solid #8b5cf655' }}>
            <RotateCcw size={10} />回程
          </span>
        )}
      </div>

      <div className="relative">
        {!editMode && (
          <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, background: 'var(--mini-border)', zIndex: 0 }} />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={localItems.map(a => a.id)} strategy={verticalListSortingStrategy}>
            {localItems.map((activity, idx) => {
              const transportSet = !!activity.transportAfter?.mode
              const hasTransport = transportSet && activity.transportAfter.mode !== 'none'
              const TransIcon    = hasTransport && TRANSPORT_ICONS[activity.transportAfter.mode]

              const mapTarget = (activity.lat && activity.lng)
                ? `${activity.lat},${activity.lng}`
                : (bi(activity.address, lang) ? encodeURIComponent(bi(activity.address, lang)) : null)

              const cardActions = {
                onView:   () => navigate(`/trip/activities/${activity.id}`),
                onEdit:   () => navigate(`/trip/activities/${activity.id}/edit`),
                onDelete: () => setDelId(activity.id),
              }

              return (
                <div key={activity.id}>
                  <div className="flex items-start gap-3 relative" style={{ zIndex: 1 }}>
                    {!editMode && (
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
                    )}

                    <div className="flex-1 min-w-0">
                      {editMode ? (
                        <SortableItem id={activity.id}>
                          {({ dragHandleProps }) => (
                            <ActivityCard
                              activity={activity} lang={lang}
                              editMode={true} dragHandleProps={dragHandleProps}
                              {...cardActions}
                            />
                          )}
                        </SortableItem>
                      ) : (
                        <div onClick={() => navigate(`/trip/activities/${activity.id}`)}>
                          <ActivityCard
                            activity={activity} lang={lang}
                            editMode={false}
                            onMapOpen={mapTarget ? () => window.open(`https://maps.google.com/?q=${mapTarget}`) : null}
                            {...cardActions}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {!editMode && idx < localItems.length - 1 && (
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
                          <button onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${activity.id}/transport`) }}
                            style={{ color: 'var(--text-secondary)', padding: 4, flexShrink: 0 }}>
                            <EllipsisVertical size={15} />
                          </button>
                        </div>
                      ) : !transportSet ? (
                        <button
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl"
                          style={{ border: '0.5px dashed var(--mini-border)', color: 'var(--text-secondary)', fontSize: 12, background: 'transparent' }}
                          onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${activity.id}/transport`) }}
                        >
                          <Plus size={12} />設定交通
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <div style={{ opacity: 0.9, transform: 'scale(1.02)', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
                <ActivityCard activity={activeItem} lang={lang} editMode={true} dragHandleProps={{}} onView={() => {}} onEdit={() => {}} onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

// All 9 trip days — shown regardless of whether activities exist
const TRIP_START_DATE = '2026-07-18'
const TRIP_END_DATE   = '2026-07-26'
const ALL_TRIP_DATES  = Array.from({ length: 9 }, (_, i) => {
  const d = new Date(TRIP_START_DATE)
  d.setDate(d.getDate() + i)
  return d.toISOString().slice(0, 10)
})

// Return the tab id to auto-select on load
function getInitialTab() {
  const today = new Date().toISOString().slice(0, 10)
  if (today >= TRIP_START_DATE && today <= TRIP_END_DATE) return today
  return 'all'
}

// ── Day tabs ───────────────────────────────────────────────────────────────
function DayTabs({ activeTab, onChange, lang }) {
  const scrollRef  = useRef(null)
  const activeRef  = useRef(null)
  const [canScroll, setCanScroll] = useState(false)

  // Check if scroll container overflows (mobile) to show fade mask
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Center the active tab when it changes (mobile only)
  useEffect(() => {
    const el = activeRef.current
    if (!el) return
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeTab])

  const allLabel = lang === 'zh-TW' ? '全部' : 'All'
  const tabs = [
    { id: 'all', label: allLabel, sub: null },
    ...ALL_TRIP_DATES.map(d => {
      const { n, d: md } = dayLabel(d)
      return { id: d, label: `Day ${n}`, sub: md }
    }),
  ]

  return (
    // Wrapper: relative so the fade pseudo-overlay can be positioned inside
    <div style={{ position: 'relative', marginBottom: 16 }}>
      {/* Scroll container — horizontal on mobile, wraps on md+ */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexWrap: 'nowrap',      // overridden to wrap on ≥768 via className
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar md:flex-wrap md:overflow-x-visible"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(tab.id)}
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: tab.sub ? '5px 10px' : '7px 12px',
                borderRadius: 20,
                border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--mini-border)',
                background: isActive ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--mini-bg)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 12,
                lineHeight: 1.2,
                cursor: 'pointer',
                minHeight: 34,
                minWidth: tab.sub ? 50 : 40,
                textAlign: 'center',
                transition: 'border-color 0.15s, background 0.15s, color 0.15s',
              }}
            >
              <span>{tab.label}</span>
              {tab.sub && <span style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{tab.sub}</span>}
            </button>
          )
        })}
      </div>

      {/* Right-edge fade mask — only shown when content overflows, hidden on md+ */}
      {canScroll && (
        <div
          className="md:hidden"
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 4,
            width: 48, pointerEvents: 'none',
            background: 'var(--tab-fade)',
          }}
        />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const { t, i18n } = useTranslation()
  const { activities, loading, deleteActivity, updateActivity } = useActivities()
  const navigate   = useNavigate()
  const [delId, setDelId]       = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState(getInitialTab)
  const lang = i18n.language

  const sorted = [...activities].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    const oa = a.order ?? 9999, ob = b.order ?? 9999
    if (oa !== ob) return oa - ob
    return (a.startTime || '').localeCompare(b.startTime || '')
  })

  const byDate = sorted.reduce((acc, a) => {
    acc[a.date] = acc[a.date] || []
    acc[a.date].push(a)
    return acc
  }, {})

  const allDates = Object.keys(byDate).sort()

  // Filter by active tab
  const visibleDates = activeTab === 'all' ? allDates : allDates.filter(d => d === activeTab)

  async function handleReorder(date, reorderedItems) {
    await Promise.all(reorderedItems.map((item, idx) => updateActivity(item.id, { order: idx })))
  }

  return (
    <div
      className="px-4 pb-24"
      style={editMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}}
    >
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('activities.title')}</h2>
        <div className="flex items-center gap-2">
          {/* Edit button — only shown when viewing a single day (not 'all') */}
          {activeTab !== 'all' && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="btn-ghost"
            >
              編輯
            </button>
          )}
          {!editMode && (
            <Link to="/trip/activities/new" className="btn-primary">
              <Plus size={18} />{t('activities.new')}
            </Link>
          )}
        </div>
      </div>

      {editMode && (
        <p className="text-secondary text-xs mb-4 text-center">
          長按並拖拉 <GripVertical size={11} className="inline" /> 調整同日順序
        </p>
      )}

      {!loading && (
        <DayTabs activeTab={activeTab} onChange={tab => { setActiveTab(tab); setEditMode(false) }} lang={lang} />
      )}

      {loading && <ActivitiesSkeleton />}
      {!loading && activities.length === 0 && (
        <p className="text-secondary text-center py-8">{t('activities.noData')}</p>
      )}

      {visibleDates.map(date => (
        <DateGroup
          key={date}
          date={date}
          items={byDate[date]}
          editMode={editMode}
          lang={lang}
          navigate={navigate}
          setDelId={setDelId}
          onReorder={(reordered) => handleReorder(date, reordered)}
        />
      ))}

      {/* Floating Done button — only visible in edit mode */}
      {editMode && (
        <button
          onClick={() => setEditMode(false)}
          style={{
            position: 'fixed',
            right: 20,
            bottom: 88,
            zIndex: 100,
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 99,
            padding: '12px 22px',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            cursor: 'pointer',
          }}
        >
          <Check size={18} />完成
        </button>
      )}

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteActivity(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}

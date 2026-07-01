import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, UtensilsCrossed, Ticket, Waves, Star, MapPin, Trash2, Pencil,
  Car, Bus, Footprints, Truck, EllipsisVertical, MapPinned,
  Plane, ArrowLeftRight, RotateCcw, GripVertical, Check,
  ArrowUpCircle, ArrowDownCircle, Navigation, ExternalLink,
  PencilLine, X, Clock,
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
import toast from 'react-hot-toast'
import { useActivities } from '../hooks/useActivities'
import { useFlights } from '../hooks/useFlights'
import { deleteFlightActivities } from '../lib/syncFlightActivities'
import ConfirmDialog from '../components/ConfirmDialog'
import NoteContent from '../components/NoteContent'
import { ActivitiesSkeleton } from '../components/Skeleton'
import { TRIP_START_DATE, TRIP_END_DATE, getRecentTripDateByDeviceDate, getDeviceDateString } from '../lib/tripCalendar'

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

function normalizeExternalLink(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}

function uiText(lang) {
  const zh = lang === 'zh-TW'
  return {
    viewDetails: zh ? '查看詳情' : 'View Details',
    edit: zh ? '編輯' : 'Edit',
    promote: zh ? '移入正式' : 'Move to Schedule',
    demote: zh ? '退回草稿' : 'Move to Drafts',
    delete: zh ? '刪除' : 'Delete',
    moreOptions: zh ? '更多選項' : 'More Options',
    dayManagement: zh ? '天數管理' : 'Day Management',
    daySwapDesc: zh
      ? '互換兩天的正式行程；機票同步產生的行程不會移動，因為它由機票日期管理。若搬入的行程撞到飛行時間，會自動避開並提醒。'
      : 'Swap confirmed activities between two days. Flight-synced activities stay put because their dates are managed from Flights. If moved activities overlap flight time, they will be shifted and you will be notified.',
    firstDay: zh ? '第一天' : 'First Day',
    secondDay: zh ? '第二天' : 'Second Day',
    cancel: zh ? '取消' : 'Cancel',
    processing: zh ? '處理中...' : 'Processing...',
    swap: zh ? '互換' : 'Swap',
    inFlight: zh ? '飛行中' : 'In Flight',
    landing: zh ? '落地' : 'Landing',
    transit: zh ? '轉機' : 'Transit',
    returnTrip: zh ? '回程' : 'Return',
    setTransport: zh ? '設定交通' : 'Set Transport',
    noDrafts: zh ? '尚無草稿行程' : 'No draft activities yet',
    scheduleTab: zh ? '行程' : 'Schedule',
    draftTab: zh ? '草稿' : 'Drafts',
    done: zh ? '完成' : 'Done',
    reorderHint: zh ? '長按並拖拉' : 'Long press and drag',
    reorderHintSuffix: zh ? '調整同日順序' : 'to reorder the day',
    noSwappableActivities: zh ? '沒有可互換的非航班正式行程' : 'No non-flight confirmed activities to swap',
    swapSuccess: zh ? '已互換兩天行程' : 'Days swapped',
    flightsSkipped: zh ? '航班同步行程已保留原日期，請到機票頁調整航班' : 'Flight-synced activities stayed on their original dates. Adjust flights from the Flights page.',
    flightAdjusted: zh ? '已避開飛行時間，部分行程開始時間已調整' : 'Flight time avoided. Some activity start times were adjusted.',
    swapFailed: zh ? '互換失敗' : 'Failed to swap days',
    deleteFailed: zh ? '刪除失敗' : 'Failed to delete',
  }
}

// Day N label from date string
function dayLabel(dateStr) {
  const start = new Date(TRIP_START_DATE)
  const cur   = new Date(dateStr)
  const diff  = Math.round((cur - start) / 86400000)
  const d = cur.getMonth() + 1 + '/' + cur.getDate()
  return { n: diff + 1, d }
}

function weekdayLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

function timeToMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function minutesToTime(minutes) {
  const safe = Math.max(0, Math.min(1439, minutes))
  const h = Math.floor(safe / 60).toString().padStart(2, '0')
  const m = (safe % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function getFlightWindows(items) {
  return items
    .filter(a => a.flightId)
    .map(a => ({
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
    }))
    .filter(w => w.start !== null && w.end !== null && w.end > w.start)
    .sort((a, b) => a.start - b.start)
}

function avoidFlightWindows(activity, windows) {
  const start = timeToMinutes(activity.startTime)
  const end = timeToMinutes(activity.endTime)
  if (start === null || end === null || end <= start) {
    return { data: {}, adjusted: false }
  }

  let nextStart = start
  for (const window of windows) {
    if (nextStart < window.end && end > window.start) {
      nextStart = Math.max(nextStart, window.end)
    }
  }

  if (nextStart === start || nextStart >= end) {
    return { data: {}, adjusted: false }
  }

  return { data: { startTime: minutesToTime(nextStart) }, adjusted: true }
}


function CardMenu({ onView, onEdit, onDelete, onPromote, onDemote }) {
  const { i18n } = useTranslation()
  const text = uiText(i18n.language)
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  const openMenu = e => { e.stopPropagation(); setOpen(true) }
  const close    = e => { e?.stopPropagation(); setOpen(false) }

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const items = [
    { label: text.viewDetails, Icon: MapPinned,       action: onView,    show: !!onView    },
    { label: text.edit,        Icon: Pencil,           action: onEdit,    show: true        },
    { label: text.promote,     Icon: ArrowUpCircle,    action: onPromote, show: !!onPromote },
    { label: text.demote,      Icon: ArrowDownCircle,  action: onDemote,  show: !!onDemote  },
    { label: text.delete,      Icon: Trash2,           action: onDelete,  show: true, danger: true },
  ].filter(i => i.show)

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        style={{ padding: 6, color: 'var(--text-secondary)', minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, flexShrink: 0, transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        aria-label={text.moreOptions}
      >
        <EllipsisVertical size={16} />
      </button>

      {open && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.32)' }}
          onClick={close}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              background: 'var(--glass-bg)', backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '0.5px solid var(--glass-border)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.16)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              animation: 'sheet-up 0.22s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--mini-border)' }} />
            </div>
            {items.map(({ label, Icon, action, danger }) => (
              <button
                key={label}
                onClick={e => { e.stopPropagation(); close(); action() }}
                onMouseEnter={e => { if (!danger) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', fontSize: 15, textAlign: 'left', background: 'none', border: 'none',
                  color: danger ? '#e05555' : 'var(--text-primary)', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />{label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ── Swipeable card (normal mode, mobile) ──────────────────────────────────
function SwipeableCard({ children, onDelete, onEdit }) {
  const { i18n } = useTranslation()
  const text = uiText(i18n.language)
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
          <Pencil size={16} />{text.edit}
        </button>
        <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); close(); onDelete() }}
          style={{ flex: 1, background: '#e05555', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, borderRadius: '0 12px 12px 0' }}>
          <Trash2 size={16} />{text.delete}
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
function ActivityCard({ activity, lang, editMode, dragHandleProps, onMapOpen, onEdit, onDelete, onView, onPromote, onDemote, showNoteContent = false }) {
  const text = uiText(lang)
  const isFlight = !!activity.flightId
  const Icon     = isFlight ? Plane : (TYPE_ICONS[activity.type] || MapPin)
  const crossDay = activity.startTime && activity.endTime && activity.endTime < activity.startTime
  const noteText = bi(activity.note, lang).trim()
  const externalLink = normalizeExternalLink(activity.link || activity.mapLink)

  const flightStyle = isFlight ? {
    background: 'color-mix(in srgb, var(--accent) 6%, var(--glass-bg))',
    border: '1px dashed color-mix(in srgb, var(--accent) 40%, transparent)',
  } : {}

  const cardClickable = !editMode && !!onView
  const cardInteractionProps = cardClickable ? {
    onClick: e => { e.stopPropagation(); onView() },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onView()
      }
    },
    role: 'button',
    tabIndex: 0,
    'aria-label': `${text.viewDetails}: ${bi(activity.title, lang)}`,
  } : {}

  return (
    <div
      className="glass-card p-4"
      style={{ ...flightStyle, cursor: cardClickable ? 'pointer' : 'default' }}
      {...cardInteractionProps}
    >
      <div className="flex items-start gap-3">
        {editMode && (
          <button
            {...dragHandleProps}
            className="mt-1 flex-shrink-0 touch-none"
            style={{ color: 'var(--text-secondary)', cursor: 'grab', padding: 4, minWidth: 32, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={lang === 'zh-TW' ? '拖拉排序' : 'Drag to reorder'}
          >
            <GripVertical size={18} />
          </button>
        )}
        <div className="mt-0.5 p-2 rounded-lg flex-shrink-0"
          style={{ background: isFlight ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--mini-bg)' }}>
          <Icon size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-primary font-medium text-base leading-snug"
            style={!editMode && onView ? { cursor: 'pointer', transition: 'color 0.15s' } : {}}
            onMouseEnter={e => { if (!editMode && onView) e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { if (!editMode && onView) e.currentTarget.style.color = '' }}
            onClick={e => { if (!editMode && onView) { e.stopPropagation(); onView() } }}
          >{bi(activity.title, lang)}</p>
          {!editMode && bi(activity.address, lang) && (() => {
            const displayName = bi(activity.location, lang) || bi(activity.address, lang)
            const mapTarget = activity.lat && activity.lng
              ? `${activity.lat},${activity.lng}`
              : encodeURIComponent(bi(activity.address, lang))
            return (
              <div className="flex items-center gap-3 mt-1.5 min-w-0">
                {activity.startTime && (
                  <span className="text-secondary text-xs whitespace-nowrap">
                    {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}
                    {crossDay && <span style={{ marginLeft: 4, color: 'var(--accent)', fontWeight: 500 }}>+1</span>}
                  </span>
                )}
                {bi(activity.address, lang) && (
                  <button
                    className="flex items-center gap-1 min-w-0"
                    style={{ color: 'var(--accent)', fontSize: 12, maxWidth: '100%' }}
                    onClick={e => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${mapTarget}`) }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <Navigation size={11} style={{ flexShrink: 0 }} />
                    <span className="truncate">{displayName}</span>
                  </button>
                )}
              </div>
            )
          })()}
          {!editMode && activity.startTime && !bi(activity.address, lang) && (
            <p className="text-secondary text-xs mt-1.5">
              {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}
              {crossDay && <span style={{ marginLeft: 4, color: 'var(--accent)', fontWeight: 500 }}>+1</span>}
            </p>
          )}
          {!editMode && externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1.5"
              style={{ color: 'var(--accent)', fontSize: 12 }}
              onClick={e => e.stopPropagation()}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <ExternalLink size={12} style={{ flexShrink: 0 }} />
              {lang === 'zh-TW' ? '相關連結' : 'Link'}
            </a>
          )}
          {!editMode && noteText && (showNoteContent ? (
            <div
              className="mt-2 px-2.5 py-1.5"
              style={{
                fontSize: 11,
                lineHeight: 1.35,
                color: 'var(--text-secondary)',
                background: 'color-mix(in srgb, var(--accent) 12%, var(--mini-bg))',
                borderRadius: 12,
              }}
            >
              <NoteContent text={noteText} className="text-secondary text-xs leading-relaxed" />
            </div>
          ) : (
            <span
              className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full"
              style={{
                fontSize: 11,
                lineHeight: 1.2,
                color: 'var(--text-secondary)',
                background: 'var(--mini-bg)',
                border: '0.5px solid var(--mini-border)',
                maxWidth: '100%',
              }}
            >
              {lang === 'zh-TW' ? '備註' : 'Note'}
            </span>
          ))}
        </div>
        {!editMode && (
          <CardMenu onView={onView} onEdit={onEdit} onDelete={onDelete} onPromote={onPromote} onDemote={onDemote} />
        )}
      </div>
    </div>
  )
}

// ── Flight group wrapper — dashed border box around all flight activities ──
function FlightGroupBox({ children, landingTime, lang }) {
  const text = uiText(lang)
  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      {/* Dashed border container */}
      <div
        style={{
          border: '2px dashed color-mix(in srgb, var(--accent) 30%, transparent)',
          borderRadius: 16,
          padding: '10px 8px 8px',
          background: 'color-mix(in srgb, var(--accent) 4%, transparent)',
          position: 'relative',
        }}
      >
        {/* Label tag at top-left */}
        <div
          style={{
            position: 'absolute',
            top: -11,
            left: 12,
            background: 'var(--bg-mid)',
            padding: '0 8px',
            fontSize: 11,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
          }}
        >
          <Plane size={11} style={{ color: 'var(--accent)' }} />
          {text.inFlight}
          {landingTime && (
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>· {text.landing} {landingTime}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

function DaySwapDialog({ lang, dates, fromDate, toDate, setFromDate, setToDate, onConfirm, onCancel, busy }) {
  const text = uiText(lang)
  const options = ALL_TRIP_DATES.map(d => {
    const { n, d: md } = dayLabel(d)
    return { id: d, label: `Day ${n} · ${md} ${weekdayLabel(d)}` }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="glass-card p-5 mx-4 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight size={18} style={{ color: 'var(--accent)' }} />
          <p className="text-primary font-medium">{text.dayManagement}</p>
        </div>
        <p className="text-secondary text-xs leading-relaxed mb-4">
          {text.daySwapDesc}
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-secondary text-sm">{text.firstDay}</span>
            <select
              className="w-full glass-mini px-3 py-2.5 mt-1 text-primary rounded-xl outline-none"
              style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)' }}
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            >
              {options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-secondary text-sm">{text.secondDay}</span>
            <select
              className="w-full glass-mini px-3 py-2.5 mt-1 text-primary rounded-xl outline-none"
              style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)' }}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            >
              {options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>{text.cancel}</button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={busy || fromDate === toDate || !dates.includes(fromDate) && !dates.includes(toDate)}
            style={busy ? { opacity: 0.65 } : undefined}
          >{busy ? text.processing : text.swap}</button>
        </div>
      </div>
    </div>
  )
}

// ── Date group ─────────────────────────────────────────────────────────────
function DateGroup({ date, items, editMode, lang, navigate, setDelId, onReorder, onDemote, showNoteContent }) {
  const { t } = useTranslation()
  const text = uiText(lang)
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

  // Items belong in the flight box if they have a flightId, or are transit/return segments
  // on a day that has at least one actual flight
  const dayHasFlight = localItems.some(a => a.flightId)
  const isFlightBoxItem = a => a.flightId || (dayHasFlight && (a.segmentId === 'transit' || a.segmentId === 'return'))

  const flightItems    = localItems.filter(a =>  isFlightBoxItem(a))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  const nonFlightItems = localItems.filter(a => !isFlightBoxItem(a))

  // Landing time = endTime of the last crossday flight (e.g. "10:40" next morning)
  const lastCrossDay = [...flightItems].reverse().find(a => a.flightId && a.endTime && a.endTime < a.startTime)
  const landingTime  = lastCrossDay?.endTime ?? null

  // On a flight day, ALL non-flight items render BELOW the flight box (postLandingItems).
  // realItems (rendered above the box) is only non-empty on non-flight days.
  const realItems        = dayHasFlight ? [] : nonFlightItems
  const postLandingItems = dayHasFlight ? nonFlightItems : []

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
        <p className="text-secondary text-sm font-medium">{date} <span style={{ fontSize: 11, opacity: 0.75 }}>{weekdayLabel(date)}</span></p>
        {isTransit && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#b45309', border: '0.5px solid #f59e0b55' }}>
            <ArrowLeftRight size={10} />{text.transit}
          </span>
        )}
        {isReturn && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#6d28d9', border: '0.5px solid #8b5cf655' }}>
            <RotateCcw size={10} />{text.returnTrip}
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
            {/* Real activities — numbered, with timeline */}
            {(editMode ? localItems : realItems).map((activity, idx) => {
              const transportSet = !!activity.transportAfter?.mode
              const hasTransport = transportSet && activity.transportAfter.mode !== 'none'
              const TransIcon    = hasTransport && TRANSPORT_ICONS[activity.transportAfter.mode]
              const mapTarget    = (activity.lat && activity.lng)
                ? `${activity.lat},${activity.lng}`
                : (bi(activity.address, lang) ? encodeURIComponent(bi(activity.address, lang)) : null)
              const cardActions  = {
                onView:   () => navigate(`/trip/activities/${activity.id}`),
                onEdit:   () => navigate(`/trip/activities/${activity.id}/edit`),
                onDelete: () => setDelId(activity.id),
                onDemote: onDemote ? () => onDemote(activity.id) : undefined,
              }
              const listForTransport = editMode ? localItems : realItems

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
                            <ActivityCard activity={activity} lang={lang} editMode={true} dragHandleProps={dragHandleProps} {...cardActions} />
                          )}
                        </SortableItem>
                      ) : (
                        <ActivityCard activity={activity} lang={lang} editMode={false}
                          showNoteContent={showNoteContent}
                          onMapOpen={mapTarget ? () => window.open(`https://maps.google.com/?q=${mapTarget}`) : null}
                          {...cardActions}
                        />
                      )}
                    </div>
                  </div>

                  {!editMode && idx < listForTransport.length - 1 && (
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
                      ) : !hasTransport ? (
                        <button
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl"
                          style={{ border: '0.5px dashed var(--mini-border)', color: 'var(--text-secondary)', fontSize: 12, background: 'transparent' }}
                          onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${activity.id}/transport`) }}
                        >
                          <Plus size={12} />{text.setTransport}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Flight group box — shown only in normal mode when there are flight activities */}
            {!editMode && flightItems.length > 0 && (
              <FlightGroupBox landingTime={landingTime} lang={lang}>
                {flightItems.map((activity, idx) => {
                  const cardActions = {
                    onView:   () => navigate(`/trip/activities/${activity.id}`),
                    onEdit:   () => navigate(`/trip/activities/${activity.id}/edit`),
                    onDelete: () => setDelId(activity.id),
                    onDemote: onDemote ? () => onDemote(activity.id) : undefined,
                  }
                  return (
                    <div key={activity.id}>
                      <div className="flex items-start gap-3 relative" style={{ zIndex: 1 }}>
                        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 40 }}>
                          {activity.startTime && (
                            <span className="text-secondary" style={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center', marginTop: 4 }}>
                              {activity.startTime}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <ActivityCard activity={activity} lang={lang} editMode={false} showNoteContent={showNoteContent} {...cardActions} />
                        </div>
                      </div>
                      {idx < flightItems.length - 1 && <div style={{ height: 8 }} />}
                    </div>
                  )
                })}
              </FlightGroupBox>
            )}

            {/* Transport connector between flight box and first post-landing activity */}
            {!editMode && flightItems.length > 0 && postLandingItems.length > 0 && (() => {
              const lastFlight = flightItems[flightItems.length - 1]
              const transportSet = !!lastFlight.transportAfter?.mode
              const hasTransport = transportSet && lastFlight.transportAfter.mode !== 'none'
              const TransIcon    = hasTransport && TRANSPORT_ICONS[lastFlight.transportAfter.mode]
              return (
                <div className="flex items-center gap-3 my-1" style={{ zIndex: 1, position: 'relative' }}>
                  <div style={{ width: 40, flexShrink: 0 }} />
                  {hasTransport ? (
                    <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl"
                      style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)' }}>
                      {TransIcon && <TransIcon size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                      <span className="text-secondary flex-1" style={{ fontSize: 12 }}>
                        {t(`activities.transport.mode.${lastFlight.transportAfter.mode}`)}
                        {lastFlight.transportAfter.durationMin > 0 && ` · ${lastFlight.transportAfter.durationMin} ${t('activities.transport.duration')}`}
                        {bi(lastFlight.transportAfter.note, lang) && ` · ${bi(lastFlight.transportAfter.note, lang)}`}
                      </span>
                      <button onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${lastFlight.id}/transport`) }}
                        style={{ color: 'var(--text-secondary)', padding: 4, flexShrink: 0 }}>
                        <EllipsisVertical size={15} />
                      </button>
                    </div>
                  ) : !transportSet ? (
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl"
                      style={{ border: '0.5px dashed var(--mini-border)', color: 'var(--text-secondary)', fontSize: 12, background: 'transparent' }}
                      onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${lastFlight.id}/transport`) }}
                    >
                      <Plus size={12} />{text.setTransport}
                    </button>
                  ) : null}
                </div>
              )
            })()}

            {/* Post-landing activities — rendered after flight box, numbered continuing from realItems */}
            {!editMode && postLandingItems.map((activity, idx) => {
              const seqNum = realItems.length + idx + 1
              const transportSet = !!activity.transportAfter?.mode
              const hasTransport = transportSet && activity.transportAfter.mode !== 'none'
              const TransIcon    = hasTransport && TRANSPORT_ICONS[activity.transportAfter.mode]
              const mapTarget    = (activity.lat && activity.lng)
                ? `${activity.lat},${activity.lng}`
                : (bi(activity.address, lang) ? encodeURIComponent(bi(activity.address, lang)) : null)
              const cardActions  = {
                onView:   () => navigate(`/trip/activities/${activity.id}`),
                onEdit:   () => navigate(`/trip/activities/${activity.id}/edit`),
                onDelete: () => setDelId(activity.id),
                onDemote: onDemote ? () => onDemote(activity.id) : undefined,
              }
              return (
                <div key={activity.id}>
                  <div className="flex items-start gap-3 relative" style={{ zIndex: 1 }}>
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 40 }}>
                      <div className="flex items-center justify-center rounded-full text-white text-xs font-bold"
                        style={{ width: 24, height: 24, background: 'var(--accent)', flexShrink: 0 }}>
                        {seqNum}
                      </div>
                      {activity.startTime && (
                        <span className="text-secondary mt-1" style={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}>
                          {activity.startTime}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <ActivityCard activity={activity} lang={lang} editMode={false}
                        showNoteContent={showNoteContent}
                        onMapOpen={mapTarget ? () => window.open(`https://maps.google.com/?q=${mapTarget}`) : null}
                        {...cardActions}
                      />
                    </div>
                  </div>
                  {idx < postLandingItems.length - 1 && (
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
                      ) : !hasTransport ? (
                        <button
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl"
                          style={{ border: '0.5px dashed var(--mini-border)', color: 'var(--text-secondary)', fontSize: 12, background: 'transparent' }}
                          onClick={e => { e.stopPropagation(); navigate(`/trip/activities/${activity.id}/transport`) }}
                        >
                          <Plus size={12} />{text.setTransport}
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
const ALL_TRIP_DATES  = Array.from({ length: 9 }, (_, i) => {
  const d = new Date(TRIP_START_DATE)
  d.setDate(d.getDate() + i)
  return d.toISOString().slice(0, 10)
})

// Return the tab id to auto-select on load
function getInitialTab() {
  return getRecentTripDateByDeviceDate(getDeviceDateString())
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
    { id: 'all', label: allLabel, dayNum: null, dayOfMonth: null, weekday: null },
    ...ALL_TRIP_DATES.map(d => {
      const { n, d: md } = dayLabel(d)
      const wd = weekdayLabel(d)
      const dayOfMonth = md.split('/')[1]
      const isWeekend = wd === 'Sat' || wd === 'Sun'
      return { id: d, dayNum: `D${n}`, dayOfMonth, weekday: wd, isWeekend }
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
          flexWrap: 'nowrap',
          gap: 5,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          alignItems: 'stretch',
        }}
        className="hide-scrollbar md:flex-wrap md:overflow-x-visible"
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab
          const weekendColor = 'var(--weekend-color)'
          const activeColor = tab.isWeekend ? weekendColor : 'var(--accent)'
          return (
            <button
              key={tab.id}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(tab.id)}
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: tab.dayOfMonth ? '5px 8px' : '0 12px',
                borderRadius: 20,
                border: isActive
                  ? `1.5px solid ${activeColor}`
                  : '1px solid var(--mini-border)',
                background: isActive
                  ? `color-mix(in srgb, ${activeColor} 12%, transparent)`
                  : 'var(--mini-bg)',
                cursor: 'pointer',
                minHeight: tab.dayOfMonth ? 52 : 34,
                minWidth: tab.dayOfMonth ? 40 : 40,
                textAlign: 'center',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {tab.dayOfMonth ? (
                <>
                  <span style={{ fontSize: 8, lineHeight: 1.2, color: isActive ? activeColor : 'var(--text-secondary)', opacity: 0.65 }}>{tab.dayNum}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: isActive ? activeColor : tab.isWeekend ? weekendColor : 'var(--text-primary)' }}>{tab.dayOfMonth}</span>
                  <span style={{ fontSize: 8, lineHeight: 1.2, color: isActive ? activeColor : tab.isWeekend ? weekendColor : 'var(--text-secondary)', opacity: isActive ? 0.8 : 0.65 }}>{tab.weekday}</span>
                </>
              ) : (
                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>{tab.label}</span>
              )}
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

// ── Draft list ─────────────────────────────────────────────────────────────
function DraftList({ drafts, lang, navigate, setDelId, onPromote }) {
  const text = uiText(lang)
  if (drafts.length === 0) return (
    <p className="text-secondary text-center py-8">{text.noDrafts}</p>
  )
  return (
    <div className="space-y-3">
      {drafts.map(activity => {
        const Icon = TYPE_ICONS[activity.type] || MapPin
        // Cards without a startTime will lose ordering when promoted — warn visually
        const missingTime = !activity.startTime
        return (
          <div
            key={activity.id}
            className="glass-card p-4"
            style={{
              border: missingTime
                ? '1px dashed color-mix(in srgb, #f59e0b 60%, transparent)'
                : '1px dashed color-mix(in srgb, var(--text-secondary) 30%, transparent)',
              background: missingTime
                ? 'color-mix(in srgb, #f59e0b 8%, var(--glass-bg))'
                : undefined,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg flex-shrink-0" style={{ background: 'var(--mini-bg)' }}>
                <Icon size={18} style={{ color: missingTime ? '#d97706' : 'var(--text-secondary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-primary font-medium text-base leading-snug"
                  style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = ''}
                  onClick={() => navigate(`/trip/activities/${activity.id}`)}
                >{bi(activity.title, lang)}</p>
                {bi(activity.location, lang) && (
                  <p className="text-secondary text-sm mt-0.5">{bi(activity.location, lang)}</p>
                )}
                {activity.date && (
                  <p className="text-secondary text-xs mt-1">{activity.date}{activity.startTime ? ` · ${activity.startTime}` : ''}</p>
                )}
                {missingTime && (
                  <p style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                    {lang === 'zh-TW' ? '移入正式前請填寫時間，否則順序會亂' : 'Add a start time before promoting to keep order'}
                  </p>
                )}
              </div>
              <CardMenu
                onEdit={() => navigate(`/trip/activities/${activity.id}/edit`)}
                onDelete={() => setDelId(activity.id)}
                onPromote={() => onPromote(activity.id)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const { t, i18n } = useTranslation()
  const { activities, loading, deleteActivity, updateActivity } = useActivities()
  const { deleteFlight } = useFlights()
  const navigate   = useNavigate()
  const [searchParams] = useSearchParams()
  const [delId, setDelId]         = useState(null)
  const [deletingIds, setDeletingIds] = useState(() => new Set())
  const [editMode, setEditMode]   = useState(false)
  useEffect(() => {
    document.body.classList.toggle('edit-mode', editMode)
    return () => document.body.classList.remove('edit-mode')
  }, [editMode])
  const [showDaySwap, setShowDaySwap] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const sheetRef = useRef(null)
  const sheetDragStartY = useRef(null)
  const sheetDragY = useRef(0)
  const closeEditSheet = useCallback(() => setEditSheetOpen(false), [])
  const onSheetPointerDown = useCallback(e => {
    sheetDragStartY.current = e.clientY
    sheetDragY.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }, [])
  const onSheetPointerMove = useCallback(e => {
    if (sheetDragStartY.current === null) return
    const dy = e.clientY - sheetDragStartY.current
    if (dy < 0) return
    sheetDragY.current = dy
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`
  }, [])
  const onSheetPointerUp = useCallback(e => {
    if (sheetDragStartY.current === null) return
    const elapsed = e.timeStamp - (e.timeStamp - sheetDragY.current)
    const shouldClose = sheetDragY.current > 120 || (sheetDragY.current / Math.max(elapsed, 1)) > 0.5
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.25s ease'
      sheetRef.current.style.transform = shouldClose ? 'translateY(100%)' : 'translateY(0)'
    }
    if (shouldClose) setTimeout(closeEditSheet, 200)
    sheetDragStartY.current = null
  }, [closeEditSheet])
  const [swapBusy, setSwapBusy] = useState(false)
  const [swapFromDate, setSwapFromDate] = useState(() => getInitialTab())
  const [swapToDate, setSwapToDate] = useState(() => {
    const idx = ALL_TRIP_DATES.indexOf(getInitialTab())
    return ALL_TRIP_DATES[Math.min(idx + 1, ALL_TRIP_DATES.length - 1)] || ALL_TRIP_DATES[0]
  })
  const [statusTab, setStatusTab] = useState('confirmed')
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('activities_tab') || getInitialTab()
  })
  const lang = i18n.language
  const text = uiText(lang)

  const visibleActivities = activities.filter(a => !deletingIds.has(a.id))
  const confirmed = visibleActivities.filter(a => (a.status ?? 'confirmed') === 'confirmed')
  const drafts    = visibleActivities.filter(a => a.status === 'draft')

  const sorted = [...confirmed].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    const af = a.flightId ? 1 : 0, bf = b.flightId ? 1 : 0
    if (af !== bf) return af - bf
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
  const visibleDates = activeTab === 'all' ? allDates : allDates.filter(d => d === activeTab)

  useEffect(() => {
    const qDate = searchParams.get('date')
    const isValidTripDate = qDate && qDate >= TRIP_START_DATE && qDate <= TRIP_END_DATE
    if (!isValidTripDate) return
    setStatusTab('confirmed')
    setEditMode(false)
    setActiveTab(qDate)
    sessionStorage.setItem('activities_tab', qDate)
  }, [searchParams])

  async function handleReorder(date, reorderedItems) {
    await Promise.all(reorderedItems.map((item, idx) => updateActivity(item.id, { order: idx })))
  }

  async function handleSwapDays() {
    if (swapFromDate === swapToDate) return

    const isConfirmed = a => (a.status ?? 'confirmed') === 'confirmed'
    const fromItems = activities.filter(a => isConfirmed(a) && a.date === swapFromDate)
    const toItems = activities.filter(a => isConfirmed(a) && a.date === swapToDate)
    const fromMovable = fromItems.filter(a => !a.flightId)
    const toMovable = toItems.filter(a => !a.flightId)
    const skippedFlights = fromItems.length + toItems.length - fromMovable.length - toMovable.length
    const fromFlightWindows = getFlightWindows(fromItems)
    const toFlightWindows = getFlightWindows(toItems)
    let adjustedCount = 0

    const updates = [
      ...fromMovable.map((activity, idx) => {
        const avoided = avoidFlightWindows(activity, toFlightWindows)
        if (avoided.adjusted) adjustedCount += 1
        return { id: activity.id, data: { date: swapToDate, order: idx, ...avoided.data } }
      }),
      ...toMovable.map((activity, idx) => {
        const avoided = avoidFlightWindows(activity, fromFlightWindows)
        if (avoided.adjusted) adjustedCount += 1
        return { id: activity.id, data: { date: swapFromDate, order: idx, ...avoided.data } }
      }),
    ]

    if (updates.length === 0) {
      toast(text.noSwappableActivities)
      return
    }

    setSwapBusy(true)
    try {
      await Promise.all(updates.map(({ id, data }) => updateActivity(id, data)))
      setShowDaySwap(false)
      toast.success(text.swapSuccess)
      if (skippedFlights > 0) {
        toast(text.flightsSkipped)
      }
      if (adjustedCount > 0) {
        toast(text.flightAdjusted)
      }
    } catch {
      toast.error(text.swapFailed)
    } finally {
      setSwapBusy(false)
    }
  }

  async function handleDeleteActivity() {
    const target = activities.find(a => a.id === delId)
    if (!target) {
      setDelId(null)
      return
    }

    const optimisticIds = target.flightId
      ? activities.filter(a => a.flightId === target.flightId).map(a => a.id)
      : [target.id]

    setDeletingIds(prev => {
      const next = new Set(prev)
      optimisticIds.forEach(id => next.add(id))
      return next
    })

    try {
      if (target.flightId) {
        await deleteFlight(target.flightId)
        await deleteFlightActivities(target.flightId)
      } else {
        await deleteActivity(target.id)
      }
    } catch {
      setDeletingIds(prev => {
        const next = new Set(prev)
        optimisticIds.forEach(id => next.delete(id))
        return next
      })
      toast.error(text.deleteFailed)
    } finally {
      setDelId(null)
    }
  }

  const promote = id => updateActivity(id, { status: 'confirmed' }).catch(() => {})
  const demote  = id => updateActivity(id, { status: 'draft'     }).catch(() => {})

  async function handleSortByTime(targetDate) {
    // Get the activities to sort: either just the active tab's date, or all dates
    const datesToSort = targetDate === 'all' ? allDates : [targetDate]
    const updates = []
    for (const date of datesToSort) {
      const items = (byDate[date] || []).filter(a => !a.flightId)
      const sorted = [...items].sort((a, b) => {
        // Activities without startTime go to the end
        if (!a.startTime && !b.startTime) return 0
        if (!a.startTime) return 1
        if (!b.startTime) return -1
        return a.startTime.localeCompare(b.startTime)
      })
      sorted.forEach((item, idx) => {
        if ((item.order ?? 9999) !== idx) {
          updates.push({ id: item.id, order: idx })
        }
      })
    }
    if (updates.length === 0) {
      toast(lang === 'zh-TW' ? '順序已是最新' : 'Already sorted')
      return
    }
    try {
      await Promise.all(updates.map(({ id, order }) => updateActivity(id, { order })))
      toast.success(lang === 'zh-TW' ? '已按時間重新排序' : 'Sorted by time')
    } catch {
      toast.error(lang === 'zh-TW' ? '排序失敗' : 'Sort failed')
    }
  }

  return (
    <div
      className="px-4 pb-36"
      style={editMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}}
    >
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('activities.title')}</h2>
        <div className="flex items-center gap-2">
          {statusTab === 'confirmed' && !editMode && (
            <button onClick={() => setEditSheetOpen(true)} className="btn-ghost" style={{ padding: '7px 10px' }}>
              <PencilLine size={15} />
            </button>
          )}
          {editMode && (
            <button onClick={() => setEditMode(false)}
              style={{ padding: '6px 10px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Check size={14} />{text.done}
            </button>
          )}
          {!editMode && (
            <Link
              to={`/trip/activities/new${statusTab === 'draft' ? '?draft=1' : ''}`}
              className="btn-primary"
            >
              <Plus size={16} />{lang === 'zh-TW' ? '新增' : 'Add'}
            </Link>
          )}
        </div>
      </div>

      {/* Status tabs: 行程 / 草稿 */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'confirmed', label: text.scheduleTab },
          { key: 'draft',     label: `${text.draftTab}${drafts.length > 0 ? ` ${drafts.length}` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatusTab(key); setEditMode(false) }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={statusTab === key
              ? { background: 'var(--accent)', color: 'white' }
              : { color: 'var(--text-secondary)' }
            }
          >{label}</button>
        ))}
      </div>

      {/* ── Confirmed tab ── */}
      {statusTab === 'confirmed' && (
        <>
          {editMode && (
            <p className="text-secondary text-xs mb-4 text-center">
              {text.reorderHint} <GripVertical size={11} className="inline" /> {text.reorderHintSuffix}
            </p>
          )}

          {!loading && (
            <DayTabs
              activeTab={activeTab}
              onChange={tab => { setActiveTab(tab); sessionStorage.setItem('activities_tab', tab); setEditMode(false) }}
              lang={lang}
            />
          )}

          {loading && <ActivitiesSkeleton />}
          {!loading && confirmed.length === 0 && (
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
              showNoteContent={activeTab !== 'all'}
              onReorder={(reordered) => handleReorder(date, reordered)}
              onDemote={demote}
            />
          ))}

          {editMode && (
            <button
              onClick={() => setEditMode(false)}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.filter = 'brightness(1.06)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'none' }}
              style={{
                position: 'fixed', right: 20, bottom: 88, zIndex: 100,
                background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: 99, padding: '12px 22px', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)', cursor: 'pointer',
                transition: 'opacity 0.15s, filter 0.15s',
              }}
            >
              <Check size={18} />{text.done}
            </button>
          )}
        </>
      )}

      {/* ── Draft tab ── */}
      {statusTab === 'draft' && (
        <>
          {loading && <ActivitiesSkeleton />}
          {!loading && (
            <DraftList
              drafts={drafts}
              lang={lang}
              navigate={navigate}
              setDelId={setDelId}
              onPromote={promote}
            />
          )}
        </>
      )}

      {delId && (
        <ConfirmDialog
          onConfirm={handleDeleteActivity}
          onCancel={() => setDelId(null)}
        />
      )}

      {showDaySwap && (
        <DaySwapDialog
          lang={lang}
          dates={allDates}
          fromDate={swapFromDate}
          toDate={swapToDate}
          setFromDate={setSwapFromDate}
          setToDate={setSwapToDate}
          onConfirm={handleSwapDays}
          onCancel={() => setShowDaySwap(false)}
          busy={swapBusy}
        />
      )}

      {/* ── Edit mode Bottom Sheet ── */}
      {editSheetOpen && (
        <>
          <div
            onClick={closeEditSheet}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 190 }}
          />
          <div
            ref={sheetRef}
            onPointerDown={onSheetPointerDown}
            onPointerMove={onSheetPointerMove}
            onPointerUp={onSheetPointerUp}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
              borderRadius: '20px 20px 0 0',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '0.5px solid var(--glass-border)',
              boxShadow: '0 -8px 40px rgba(30,61,79,0.16)',
              padding: '10px 16px 48px',
              animation: 'sheet-up 0.25s cubic-bezier(0.32,0.72,0,1)',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 12px', cursor: 'grab' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--mini-border)' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, textAlign: 'center', fontWeight: 500 }}>
              {lang === 'zh-TW' ? '選擇編輯模式' : 'Select edit mode'}
            </p>
            {[
              {
                icon: <GripVertical size={22} />,
                title: lang === 'zh-TW' ? '排序活動' : 'Reorder',
                desc: lang === 'zh-TW' ? '長按並拖曳，調整當日活動順序' : 'Drag to reorder activities for the day',
                disabled: activeTab === 'all',
                onSelect: () => {
                  setEditMode(true)
                  closeEditSheet()
                },
              },
              {
                icon: <ArrowLeftRight size={22} />,
                title: lang === 'zh-TW' ? '交換日期' : 'Swap Days',
                desc: lang === 'zh-TW' ? '選取兩天，互換所有活動' : 'Swap all activities between two days',
                disabled: false,
                onSelect: () => {
                  const baseDate = activeTab !== 'all' ? activeTab : getInitialTab()
                  const baseIdx = ALL_TRIP_DATES.indexOf(baseDate)
                  setSwapFromDate(baseDate)
                  setSwapToDate(ALL_TRIP_DATES[baseIdx + 1] || ALL_TRIP_DATES[baseIdx - 1] || ALL_TRIP_DATES[0])
                  setShowDaySwap(true)
                  closeEditSheet()
                },
              },
              {
                icon: <Clock size={22} />,
                title: lang === 'zh-TW' ? '按時間排序' : 'Sort by Time',
                desc: activeTab === 'all'
                  ? (lang === 'zh-TW' ? '所有日期依 startTime 重新排序' : 'Re-sort all days by start time')
                  : (lang === 'zh-TW' ? '此日期依 startTime 重新排序' : 'Re-sort this day by start time'),
                disabled: false,
                onSelect: () => {
                  handleSortByTime(activeTab)
                  closeEditSheet()
                },
              },
            ].map((opt, i) => (
              <button key={i}
                onClick={opt.disabled ? undefined : opt.onSelect}
                onMouseEnter={e => { if (!opt.disabled) { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, var(--mini-bg))'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 35%, var(--mini-border))' } }}
                onMouseLeave={e => { if (!opt.disabled) { e.currentTarget.style.background = 'var(--mini-bg)'; e.currentTarget.style.borderColor = 'var(--mini-border)' } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                  padding: '16px 14px', marginBottom: 10,
                  background: opt.disabled ? 'rgba(0,0,0,0.03)' : 'var(--mini-bg)',
                  border: `0.5px solid ${opt.disabled ? 'rgba(0,0,0,0.08)' : 'var(--mini-border)'}`,
                  borderRadius: 16, cursor: opt.disabled ? 'not-allowed' : 'pointer',
                  opacity: opt.disabled ? 0.45 : 1,
                  textAlign: 'left',
                  transition: 'background 0.15s, border-color 0.15s',
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}>
                  {opt.icon}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{opt.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{opt.desc}</p>
                  {opt.disabled && (
                    <p style={{ fontSize: 11, color: '#e05c5c', marginTop: 2 }}>
                      {lang === 'zh-TW' ? '請先選擇特定日期' : 'Please select a specific day first'}
                    </p>
                  )}
                </div>
              </button>
            ))}
            <button onClick={closeEditSheet}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--mini-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px', background: 'transparent', border: '0.5px solid var(--mini-border)', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', transition: 'background 0.15s, color 0.15s' }}>
              <X size={14} />{lang === 'zh-TW' ? '取消' : 'Cancel'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Plus, X, ChevronRight, ChevronUp, ChevronLeft, Utensils, Car, Home, Star, ShoppingBag, MoreHorizontal, Trash2, Pencil, CalendarDays } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useExpenses } from '../hooks/useExpenses'
import { useAuth } from '../contexts/AuthContext'
import { useTrip } from '../hooks/useTrip'
import ConfirmDialog from '../components/ConfirmDialog'
import { ListSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'

const CATEGORIES = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'other']
const CURRENCIES  = ['USD', 'KRW', 'TWD']

const CAT_META = {
  food:          { color: '#c4844a', Icon: Utensils       },
  transport:     { color: '#5a8faa', Icon: Car            },
  accommodation: { color: '#8a6eaa', Icon: Home           },
  activity:      { color: '#5a9e7a', Icon: Star           },
  shopping:      { color: '#b06070', Icon: ShoppingBag    },
  other:         { color: '#8a9aaa', Icon: MoreHorizontal },
}

// 每幣別預設匯率（fallback，真實匯率從 useExpenses 的 rates 取）
const DEFAULT_RATES = { USD: 32, KRW: 0.024 }

const emptyForm = (currentUserUid = '') => ({
  title: '', amount: '', currency: 'USD', category: 'food',
  date: new Date().toISOString().slice(0, 10),
  paidBy: currentUserUid,
  convertToTWD: false,
})

// ── Helpers ────────────────────────────────────────────────────────────────
function CatIcon({ cat }) {
  const { color, Icon } = CAT_META[cat] ?? { color: '#999', Icon: MoreHorizontal }
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={16} style={{ color }} />
    </div>
  )
}

function DonutChart({ segments, twdTotal }) {
  const size = 110
  const r = 36, cx = size / 2, cy = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const dash = (s.value / twdTotal) * circumference
    const arc = { ...s, dash, offset }
    offset += dash
    return arc
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--mini-border)" strokeWidth="16" />
      {arcs.map((a, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={a.color} strokeWidth="16"
          strokeDasharray={`${a.dash} ${circumference - a.dash}`}
          strokeDashoffset={-a.offset}
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="8" fill="var(--text-secondary)">總計 TWD</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-primary)">
        {twdTotal >= 10000
          ? `${(twdTotal / 10000).toFixed(1)}萬`
          : Math.round(twdTotal).toLocaleString()}
      </text>
    </svg>
  )
}

// ── Inline date picker (calendar grid, date-only) ─────────────────────────
function DatePicker({ value, onChange }) {
  // value: 'YYYY-MM-DD', onChange: (str) => void
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : null
  const [viewDate, setViewDate] = useState(() => selected || new Date())

  const calendarDays = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [viewDate])

  const selectDate = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${dd}`)
    setOpen(false)
  }

  const shiftMonth = (n) => setViewDate(v => new Date(v.getFullYear(), v.getMonth() + n, 1))

  const displayValue = selected
    ? `${selected.getFullYear()}/${String(selected.getMonth() + 1).padStart(2, '0')}/${String(selected.getDate()).padStart(2, '0')}`
    : '選擇日期'

  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', boxSizing: 'border-box',
          background: 'var(--mini-bg)',
          border: `0.5px solid ${open ? 'var(--accent)' : 'var(--mini-border)'}`,
          boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)' : 'none',
          borderRadius: 12, fontSize: 15, color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          {displayValue}
        </span>
        <ChevronRight size={14} style={{ color: 'var(--text-secondary)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '0.5px solid var(--glass-border)', borderRadius: 14,
          boxShadow: '0 8px 28px rgba(30,61,79,0.16)',
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '0.5px solid var(--mini-border)' }}>
            <button type="button" onClick={() => shiftMonth(-1)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 8 }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
            </span>
            <button type="button" onClick={() => shiftMonth(1)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 8 }}>
              <ChevronRight size={15} />
            </button>
          </div>
          {/* Week labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '6px 8px 2px', textAlign: 'center' }}>
            {weekLabels.map(l => (
              <span key={l} style={{ fontSize: 10, color: 'var(--text-secondary)', padding: '1px 0' }}>{l}</span>
            ))}
          </div>
          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 8px 6px', gap: 1 }}>
            {calendarDays.map(d => {
              const isCurrentMonth = d.getMonth() === viewDate.getMonth()
              const isSelected = selected &&
                d.getFullYear() === selected.getFullYear() &&
                d.getMonth() === selected.getMonth() &&
                d.getDate() === selected.getDate()
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <button key={d.toISOString()} type="button" onClick={() => selectDate(d)}
                  style={{
                    height: 28, borderRadius: 99, fontSize: 12, border: 'none', cursor: 'pointer',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? 'white' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                    outline: isToday && !isSelected ? '1.5px solid var(--accent)' : 'none',
                    opacity: isCurrentMonth ? 1 : 0.35,
                    fontWeight: isSelected ? 600 : 400,
                  }}>{d.getDate()}</button>
              )
            })}
          </div>
          {/* Today shortcut */}
          <div style={{ borderTop: '0.5px solid var(--mini-border)', padding: '6px 10px' }}>
            <button type="button" onClick={() => { selectDate(new Date()) }}
              style={{ width: '100%', padding: '4px 0', fontSize: 12, fontWeight: 500, color: 'var(--accent)', border: 'none', background: 'none', cursor: 'pointer' }}>
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bottom Sheet hook ──────────────────────────────────────────────────────
function useSheet() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dragStart = useRef(null)
  const dragY = useRef(0)
  const close = useCallback(() => setOpen(false), [])
  const onPointerDown = useCallback(e => {
    dragStart.current = e.clientY; dragY.current = 0
    if (ref.current) ref.current.style.transition = 'none'
  }, [])
  const onPointerMove = useCallback(e => {
    if (dragStart.current === null) return
    const dy = e.clientY - dragStart.current
    if (dy < 0) return
    dragY.current = dy
    if (ref.current) ref.current.style.transform = `translateY(${dy}px)`
  }, [])
  const onPointerUp = useCallback(() => {
    if (dragStart.current === null) return
    const should = dragY.current > 80
    if (ref.current) {
      ref.current.style.transition = 'transform 0.25s ease'
      ref.current.style.transform = should ? 'translateY(100%)' : 'translateY(0)'
    }
    if (should) setTimeout(close, 220)
    dragStart.current = null
  }, [close])
  return { open, setOpen, close, ref, onPointerDown, onPointerMove, onPointerUp }
}

// ── Add / Edit Sheet ────────────────────────────────────────────────────────
function ExpenseSheet({ sheet, form, setForm, members, rates, onSave, isEdit }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const { t } = useTranslation()

  const needRate = form.currency !== 'TWD'

  // 即時匯率（顯示用）
  const liveRate = useMemo(() => {
    if (form.currency === 'USD') return rates?.TWD ?? DEFAULT_RATES.USD
    if (form.currency === 'KRW') return rates ? (rates.TWD / rates.KRW) : DEFAULT_RATES.KRW
    return 1
  }, [form.currency, rates])

  // 換算後 TWD 預覽
  const twdPreview = useMemo(() => {
    if (!form.convertToTWD || !form.amount || !liveRate) return null
    return Math.round(parseFloat(form.amount) * liveRate)
  }, [form.convertToTWD, form.amount, liveRate])

  const handleToggleConvert = () => setForm(f => ({ ...f, convertToTWD: !f.convertToTWD }))

  if (!sheet.open) return null

  const inputStyle = {
    width: '100%', padding: '10px 14px', boxSizing: 'border-box',
    background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)',
    borderRadius: 12, fontSize: 15, color: 'var(--text-primary)', outline: 'none',
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)' }} onClick={sheet.close}>
      <div
        ref={sheet.ref}
        onPointerDown={sheet.onPointerDown}
        onPointerMove={sheet.onPointerMove}
        onPointerUp={sheet.onPointerUp}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--glass-bg)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderTop: '0.5px solid var(--glass-border)', borderRadius: '20px 20px 0 0',
          padding: '10px 20px', paddingBottom: 'max(32px, env(safe-area-inset-bottom, 16px))',
          touchAction: 'none', userSelect: 'none',
          animation: 'sheet-up 0.25s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '96dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 14, cursor: 'grab' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--mini-border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {isEdit ? '編輯支出' : '新增支出'}
          </p>
          <button onClick={sheet.close} style={{ color: 'var(--text-secondary)', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Title */}
          <input placeholder="項目名稱" value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} />

          {/* Amount + Currency */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="number" inputMode="decimal" placeholder="金額"
              value={form.amount} onChange={e => set('amount', e.target.value)}
              style={{ ...inputStyle, flex: 1, width: 'auto' }}
            />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {CURRENCIES.map(c => (
                <button key={c} onClick={() => set('currency', c)}
                  style={{
                    padding: '10px 10px', borderRadius: 10, border: '0.5px solid', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: form.currency === c ? 'var(--accent)' : 'var(--mini-bg)',
                    color:      form.currency === c ? 'white' : 'var(--text-secondary)',
                    borderColor: form.currency === c ? 'var(--accent)' : 'var(--mini-border)',
                  }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Convert to TWD (only shown for USD / KRW) */}
          {needRate && (
            <div style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>轉成台幣儲存</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    今日匯率：1 {form.currency} ≈ {liveRate.toFixed(form.currency === 'KRW' ? 4 : 2)} TWD
                  </p>
                </div>
                <button type="button" onClick={handleToggleConvert}
                  style={{
                    width: 40, height: 22, borderRadius: 99, padding: 2, border: 'none', cursor: 'pointer',
                    background: form.convertToTWD ? 'var(--accent)' : 'var(--mini-border)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: form.convertToTWD ? 'flex-end' : 'flex-start',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              {twdPreview !== null && (
                <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
                  將儲存為 TWD {twdPreview.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Category */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(c => {
              const { color } = CAT_META[c]
              return (
                <button key={c} onClick={() => set('category', c)}
                  style={{
                    padding: '6px 12px', borderRadius: 99, border: '0.5px solid', fontSize: 13, cursor: 'pointer',
                    background: form.category === c ? color : 'var(--mini-bg)',
                    color:      form.category === c ? 'white' : 'var(--text-secondary)',
                    borderColor: form.category === c ? color : 'var(--mini-border)',
                  }}>{t(`expenses.categories.${c}`)}</button>
              )
            })}
          </div>

          {/* Date */}
          <DatePicker value={form.date} onChange={v => set('date', v)} />

          {/* Paid by */}
          {members.length > 0 && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>付款人</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {members.map(m => (
                  <button key={m.uid} onClick={() => set('paidBy', m.uid)}
                    style={{
                      padding: '6px 14px', borderRadius: 99, border: '0.5px solid', fontSize: 13, cursor: 'pointer',
                      background: form.paidBy === m.uid ? 'var(--accent)' : 'var(--mini-bg)',
                      color:      form.paidBy === m.uid ? 'white' : 'var(--text-secondary)',
                      borderColor: form.paidBy === m.uid ? 'var(--accent)' : 'var(--mini-border)',
                    }}>{m.displayName || m.name || m.uid}</button>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <button onClick={onSave}
            style={{ width: '100%', padding: 13, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
            儲存
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Collapsible group ───────────────────────────────────────────────────────
function GroupSection({ groupKey, label, sublabel, items, toTWD, memberName, onEdit, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const groupTWD = items.reduce((s, e) => s + toTWD(e.amount, e.currency), 0)

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setCollapsed(v => !v)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {collapsed
            ? <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
            : <ChevronUp    size={14} style={{ color: 'var(--text-secondary)' }} />}
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</p>
          {sublabel && <p style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>{sublabel}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>≈ TWD {Math.round(groupTWD).toLocaleString()}</p>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', borderRadius: 99, padding: '2px 8px' }}>
            {items.length} 筆
          </span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(exp => (
            <div key={exp.id} className="glass-mini"
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CatIcon cat={exp.category} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {memberName(exp.paidBy)}
                  {exp.date && <span style={{ opacity: 0.7 }}> · {exp.date}</span>}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {exp.currency} {exp.amount.toLocaleString()}
                </p>
                {exp.currency !== 'TWD' && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    ≈ {Math.round(toTWD(exp.amount, exp.currency)).toLocaleString()}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button onClick={() => onEdit(exp)}
                  style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 6, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(exp.id)}
                  style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', borderRadius: 6, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { t }  = useTranslation()
  const { user } = useAuth()
  const { trip } = useTrip()
  const { expenses, loading, rates, toTWD, addExpense, updateExpense, deleteExpense } = useExpenses()

  const [usersMap, setUsersMap] = useState({})
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const map = {}
      snap.forEach(d => { map[d.id] = { uid: d.id, ...d.data() } })
      setUsersMap(map)
    })
    return unsub
  }, [])

  // Merge trip.members with users collection for display names
  const members = useMemo(() => {
    const tripMemberMap = Object.fromEntries((trip?.members || []).map(m => [m.uid, m]))
    return Object.values(usersMap).map(u => ({
      uid: u.uid,
      displayName: u.name || u.displayName || u.uid,
    })).filter(u => tripMemberMap[u.uid] || true) // show all registered users
  }, [usersMap, trip])

  const memberName = uid => {
    const u = usersMap[uid]
    if (u) return u.name || u.displayName || uid
    const m = trip?.members?.find(m => m.uid === uid)
    return m?.displayName || uid || '-'
  }

  const sheet = useSheet()
  const [form, setForm]   = useState(() => emptyForm(user?.uid ?? ''))
  const [editId, setEditId] = useState(null)
  const [delId, setDelId]   = useState(null)
  const [groupBy, setGroupBy] = useState('date') // 'date' | 'person'

  // Keep paidBy defaulting to current user when user loads
  useEffect(() => {
    if (user?.uid && !form.paidBy) setForm(f => ({ ...f, paidBy: user.uid }))
  }, [user?.uid])

  const openAdd = () => {
    setForm(emptyForm(user?.uid ?? ''))
    setEditId(null)
    sheet.setOpen(true)
  }
  const openEdit = exp => {
    setForm({ ...emptyForm(user?.uid ?? ''), ...exp, amount: String(exp.amount), convertToTWD: false })
    setEditId(exp.id)
    sheet.setOpen(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.amount) { toast.error('請填寫標題和金額'); return }
    let amount = parseFloat(form.amount)
    let currency = form.currency
    if (form.convertToTWD && form.currency !== 'TWD') {
      const rate = form.currency === 'USD'
        ? (rates?.TWD ?? DEFAULT_RATES.USD)
        : (rates ? (rates.TWD / rates.KRW) : DEFAULT_RATES.KRW)
      amount = Math.round(amount * rate)
      currency = 'TWD'
    }
    const { convertToTWD, ...rest } = form
    const data = { ...rest, amount, currency, paidBy: form.paidBy || user?.uid || '' }
    try {
      if (editId) {
        await updateExpense(editId, data)
        setEditId(null)
      } else {
        await addExpense(data)
      }
      sheet.close()
      toast.success('已儲存')
    } catch {
      toast.error('儲存失敗')
    }
  }

  // ── Derived data ──
  const twdTotal = expenses.reduce((s, e) => s + toTWD(e.amount, e.currency), 0)

  const catSegments = CATEGORIES.map(c => {
    const twd = expenses.filter(e => e.category === c).reduce((s, e) => s + toTWD(e.amount, e.currency), 0)
    return { cat: c, color: CAT_META[c].color, label: t(`expenses.categories.${c}`), value: twd }
  }).filter(s => s.value > 0)

  const foreignTotals = CURRENCIES.filter(c => c !== 'TWD').map(c => ({
    currency: c,
    sum: expenses.filter(e => e.currency === c).reduce((s, e) => s + e.amount, 0),
  })).filter(d => d.sum > 0)

  const byDate   = expenses.reduce((acc, e) => { acc[e.date]    = acc[e.date]    || []; acc[e.date].push(e);    return acc }, {})
  const byPerson = expenses.reduce((acc, e) => { acc[e.paidBy]  = acc[e.paidBy]  || []; acc[e.paidBy].push(e); return acc }, {})

  const groups = groupBy === 'date'
    ? Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a))
    : Object.entries(byPerson).sort(([a], [b]) => {
        const tA = byPerson[a].reduce((s, e) => s + toTWD(e.amount, e.currency), 0)
        const tB = byPerson[b].reduce((s, e) => s + toTWD(e.amount, e.currency), 0)
        return tB - tA
      })

  return (
    <div className="px-4 pb-36">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('expenses.title')}</h2>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} />{t('expenses.new')}
        </button>
      </div>

      {/* ── Summary card ── */}
      <div className="glass-card p-4 mb-4">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Donut */}
          {twdTotal > 0
            ? <DonutChart segments={catSegments} twdTotal={twdTotal} />
            : (
              <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--mini-bg)', border: '2px dashed var(--mini-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22, opacity: 0.3 }}>¥</span>
              </div>
            )
          }
          {/* Legend / empty state */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            {twdTotal === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>尚無支出記錄</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7, lineHeight: 1.5 }}>點「新增費用」開始記帳，旅途中的花費將在這裡匯總</p>
                <button onClick={openAdd} style={{ alignSelf: 'flex-start', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', borderRadius: 99, fontSize: 12, color: 'var(--accent)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <Plus size={12} />新增第一筆
                </button>
              </div>
            ) : (
              <>
                {catSegments.slice(0, 5).map(s => (
                  <div key={s.cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flexShrink: 0 }}>
                      {Math.round(s.value).toLocaleString()}
                    </span>
                  </div>
                ))}
                {catSegments.length > 5 && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>…還有 {catSegments.length - 5} 個類別</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Foreign currency totals */}
        {foreignTotals.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {foreignTotals.map(({ currency, sum }) => (
              <div key={currency} className="glass-mini" style={{ flex: 1, padding: '8px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{currency}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Exchange rate badges ── */}
      {rates && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'USD', value: rates.TWD?.toFixed(2) },
            { label: 'KRW', value: (rates.TWD / rates.KRW)?.toFixed(4) },
          ].map(({ label, value }) => value && (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>1 {label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.5 }}>=</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>{value} TWD</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>今日匯率</span>
          </div>
        </div>
      )}

      {/* ── Group-by toggle ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ k: 'date', label: '依日期' }, { k: 'person', label: '依付款人' }].map(({ k, label }) => (
          <button key={k} onClick={() => setGroupBy(k)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={groupBy === k
              ? { background: 'var(--accent)', color: 'white' }
              : { color: 'var(--text-secondary)' }
            }>{label}</button>
        ))}
      </div>

      {/* ── List ── */}
      {loading && <ListSkeleton count={3} />}
      {!loading && expenses.length === 0 && (
        <p className="text-secondary text-center py-8">{t('expenses.noData')}</p>
      )}

      {!loading && groups.map(([key, items]) => (
        <GroupSection
          key={key}
          groupKey={key}
          label={groupBy === 'date' ? key : memberName(key)}
          sublabel={groupBy === 'person' ? `${items.length} 筆` : undefined}
          items={items}
          toTWD={toTWD}
          memberName={groupBy === 'date' ? memberName : (uid => uid === key ? '' : memberName(uid))}
          onEdit={openEdit}
          onDelete={id => setDelId(id)}
        />
      ))}

      {/* ── Sheets & Dialogs ── */}
      <ExpenseSheet
        sheet={sheet}
        form={form}
        setForm={setForm}
        members={members}
        rates={rates}
        onSave={handleSave}
        isEdit={!!editId}
      />

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteExpense(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}

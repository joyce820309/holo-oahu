import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Check, Loader2, Copy, MoveRight, AlertTriangle, CloudRain } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import ImageUploader from '../components/ImageUploader'
import toast from 'react-hot-toast'

const TYPES    = ['restaurant', 'attraction', 'beach', 'experience', 'accommodation', 'other']
const SEGMENTS = [
  { id: 'hawaii',  label: { zh: '夏威夷', en: 'Hawaii'  } },
  { id: 'seoul',   label: { zh: '首爾',   en: 'Seoul'   } },
  { id: 'transit', label: { zh: '轉機',   en: 'Transit' } },
  { id: 'return',  label: { zh: '回程',   en: 'Return'  } },
]

const TRIP_START = new Date('2026-07-18')
const TRIP_DAYS = Array.from({ length: 9 }, (_, i) => {
  const d = new Date(TRIP_START)
  d.setDate(d.getDate() + i)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { value: `2026-${mm}-${dd}`, label: `${mm}-${dd} 第${i + 1}天` }
})
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

const emptyForm = () => ({
  title:    { zh: '', en: '' },
  location: { zh: '', en: '' },
  address:  { zh: '', en: '' },
  note:     { zh: '', en: '' },
  type: 'attraction', date: '', startTime: '', endTime: '',
  lat: '', lng: '', link: '', segmentId: 'hawaii', order: 0,
  images: [],
  transportAfter: { mode: 'none', durationMin: '', note: { zh: '', en: '' } },
})

function normalizeExternalLink(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}

function normalizeTransportAfterForSave(transportAfter) {
  if (transportAfter == null) return null

  if (Array.isArray(transportAfter)) {
    return transportAfter
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({
        ...entry,
        durationMin: entry.durationMin ? parseInt(entry.durationMin, 10) : 0,
        note: {
          zh: entry.note?.zh || '',
          en: entry.note?.en || '',
        },
      }))
  }

  if (typeof transportAfter === 'object') {
    return {
      ...transportAfter,
      durationMin: transportAfter.durationMin ? parseInt(transportAfter.durationMin, 10) : 0,
      note: {
        zh: transportAfter.note?.zh || '',
        en: transportAfter.note?.en || '',
      },
    }
  }

  return null
}

function CustomSelect({ value, onChange, options, placeholder = '—' }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const [hoveredValue, setHoveredValue] = useState(null)
  const triggerRef = useRef(null)
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  const updateDropPos = () => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  useEffect(() => {
    function onDown(e) {
      if (!triggerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (!open) return
    updateDropPos()
    window.addEventListener('scroll', updateDropPos, true)
    window.addEventListener('resize', updateDropPos)
    return () => {
      window.removeEventListener('scroll', updateDropPos, true)
      window.removeEventListener('resize', updateDropPos)
    }
  }, [open])

  function handleOpen() {
    if (!open) updateDropPos()
    setOpen(v => !v)
  }

  const panel = open ? (
    <div
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        zIndex: 9999,
        background: 'var(--glass-bg)',
        border: '0.5px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxHeight: 224, overflowY: 'auto', padding: '4px 0' }}>
        {options.map(o => {
          const isSelected = o.value === value
          const isHovered  = o.value === hoveredValue
          return (
            <button
              key={o.value}
              type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
              onMouseEnter={() => setHoveredValue(o.value)}
              onMouseLeave={() => setHoveredValue(null)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left"
              style={{
                background: isSelected
                  ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                  : isHovered
                  ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                  : 'transparent',
                color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isSelected ? 500 : 400,
              }}
            >
              <span>{o.label}</span>
              {isSelected && <Check size={13} strokeWidth={2} style={{ color: 'var(--accent)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <>
      <div ref={triggerRef}>
        <button
          type="button"
          onClick={handleOpen}
          className="w-full glass-mini flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left"
          style={{
            background: 'var(--mini-bg)',
            border: open ? '0.5px solid var(--accent)' : '0.5px solid var(--mini-border)',
            color: selectedLabel ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
          }}
        >
          <span>{selectedLabel || placeholder}</span>
          <ChevronDown size={14} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
      {panel && createPortal(panel, document.body)}
    </>
  )
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <CustomSelect value={value} onChange={onChange} options={options} placeholder={placeholder} />
    </div>
  )
}

function MinuteCombo({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState(value || '')
  const wrapRef = useRef(null)

  useEffect(() => { setInputVal(value || '') }, [value])

  useEffect(() => {
    if (!open) return
    const h = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const commit = (raw) => {
    const n = parseInt(raw, 10)
    if (!isNaN(n)) {
      const clamped = String(Math.min(59, Math.max(0, n))).padStart(2, '0')
      onChange(clamped)
      setInputVal(clamped)
    }
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <div className="flex items-center glass-mini rounded-xl overflow-hidden"
        style={{ background: 'var(--mini-bg)', border: open ? '0.5px solid var(--accent)' : '0.5px solid var(--mini-border)', boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none' }}>
        <input
          type="text"
          inputMode="numeric"
          value={inputVal}
          onChange={e => {
            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 2)
            setInputVal(digitsOnly)
          }}
          onBlur={e => { if (!wrapRef.current?.contains(e.relatedTarget)) commit(e.target.value) }}
          onKeyDown={e => { if (e.key === 'Enter') commit(e.target.value); if (e.key === 'Escape') setOpen(false) }}
          placeholder="分"
          className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
          style={{ color: inputVal ? 'var(--text-primary)' : 'var(--text-secondary)', minWidth: 0, width: '100%' }}
        />
        <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
          className="px-2 py-2.5" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
          <ChevronDown size={14} strokeWidth={1.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
      {open && createPortal(
        <div style={{
          position: 'fixed',
          top: wrapRef.current ? wrapRef.current.getBoundingClientRect().bottom + 6 : 0,
          left: wrapRef.current ? wrapRef.current.getBoundingClientRect().left : 0,
          width: wrapRef.current ? wrapRef.current.getBoundingClientRect().width : 120,
          zIndex: 9999, background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
        }}>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
            {MINUTES.map(m => (
              <button key={m} type="button"
                onMouseDown={() => { onChange(m); setInputVal(m); setOpen(false) }}
                className="w-full px-3 py-2.5 text-sm text-left"
                style={{
                  background: m === value ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                  color: m === value ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: m === value ? 500 : 400,
                }}>
                {m} 分
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function HourCombo({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState(value || '')
  const wrapRef = useRef(null)

  useEffect(() => { setInputVal(value || '') }, [value])

  useEffect(() => {
    if (!open) return
    const h = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const commit = (raw) => {
    const text = String(raw ?? '').trim()
    if (text === '') {
      onChange('')
      setInputVal('')
      setOpen(false)
      return
    }
    const n = parseInt(text, 10)
    if (!isNaN(n)) {
      const clamped = String(Math.min(23, Math.max(0, n))).padStart(2, '0')
      onChange(clamped)
      setInputVal(clamped)
    }
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <div className="flex items-center glass-mini rounded-xl overflow-hidden"
        style={{ background: 'var(--mini-bg)', border: open ? '0.5px solid var(--accent)' : '0.5px solid var(--mini-border)', boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none' }}>
        <input
          type="text"
          inputMode="numeric"
          value={inputVal}
          onChange={e => {
            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 2)
            setInputVal(digitsOnly)
          }}
          onBlur={e => { if (!wrapRef.current?.contains(e.relatedTarget)) commit(e.target.value) }}
          onKeyDown={e => { if (e.key === 'Enter') commit(e.currentTarget.value); if (e.key === 'Escape') setOpen(false) }}
          placeholder="時"
          className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
          style={{ color: inputVal ? 'var(--text-primary)' : 'var(--text-secondary)', minWidth: 0, width: '100%' }}
        />
        <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
          className="px-2 py-2.5" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
          <ChevronDown size={14} strokeWidth={1.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
      {open && createPortal(
        <div style={{
          position: 'fixed',
          top: wrapRef.current ? wrapRef.current.getBoundingClientRect().bottom + 6 : 0,
          left: wrapRef.current ? wrapRef.current.getBoundingClientRect().left : 0,
          width: wrapRef.current ? wrapRef.current.getBoundingClientRect().width : 120,
          zIndex: 9999, background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
        }}>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
            {HOURS.map(h => (
              <button key={h} type="button"
                onMouseDown={() => { onChange(h); setInputVal(h); setOpen(false) }}
                className="w-full px-3 py-2.5 text-sm text-left"
                style={{
                  background: h === value ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                  color: h === value ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: h === value ? 500 : 400,
                }}>
                {h} 時
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function TimeSelect({ label, value, onChange }) {
  const [h, m] = value ? value.split(':') : ['', '']
  const setH = v => onChange(v ? `${v}:${m || '00'}` : '')
  const setM = v => onChange(h ? `${h}:${v}` : `00:${v}`)
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <HourCombo value={h || ''} onChange={setH} />
        </div>
        <span className="text-secondary font-medium">:</span>
        <MinuteCombo value={m || ''} onChange={setM} />
      </div>
    </div>
  )
}

function AdvancedToggle({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-1"
      >
        <span className="text-secondary text-sm">進階設定</span>
        {/* toggle pill */}
        <div style={{
          width: 40, height: 22, borderRadius: 99, padding: 2, transition: 'background 0.2s',
          background: open ? 'var(--accent)' : 'var(--mini-border)',
          display: 'flex', alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'flex-start',
        }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </div>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

function BilingualField({ label, inputLang, setInputLang, zhValue, enValue, onZhChange, onEnChange, type = 'text', placeholder, multiline = false, rows = 4 }) {
  const value = inputLang === 'zh' ? zhValue : enValue
  const onValueChange = (v) => {
    if (inputLang === 'zh') onZhChange(v)
    else onEnChange(v)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-secondary text-sm">{label}</label>
        <div className="flex items-center gap-1">
          {['zh', 'en'].map(l => (
            <button
              key={l}
              onClick={() => setInputLang(l)}
              className="px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: inputLang === l ? 'var(--accent)' : 'var(--mini-bg)',
                color:      inputLang === l ? 'white'         : 'var(--text-secondary)',
                border:     `0.5px solid ${inputLang === l ? 'var(--accent)' : 'var(--mini-border)'}`,
              }}
            >{l === 'zh' ? '中' : 'EN'}</button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl resize-y"
          style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder={placeholder}
          className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
          style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
        />
      )}
    </div>
  )
}

// 'copy' | 'move' | null
function DatePickerSheet({ mode, currentDate, onConfirm, onClose }) {
  const isCopy = mode === 'copy'
  const [selected, setSelected] = useState(() => (isCopy ? [] : (currentDate || '')))
  const [confirming, setConfirming] = useState(false)

  const toggleDate = (value, disabled) => {
    if (disabled) return
    if (!isCopy) {
      setSelected(value)
      return
    }
    setSelected(prev => prev.includes(value)
      ? prev.filter(d => d !== value)
      : [...prev, value])
  }

  const selectedCount = isCopy ? selected.length : (selected ? 1 : 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-card w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-primary font-medium text-base">
            {isCopy ? '複製到哪天？' : '移動到哪天？'}
          </p>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-secondary)', padding: 4, fontSize: 16, lineHeight: 1 }}
          >✕</button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {TRIP_DAYS.map(({ value, label }) => {
            const isActive  = isCopy ? selected.includes(value) : value === selected
            const isCurrent = value === currentDate
            // 同日不再 disable：複製到同一天可用於「同活動拆兩段、中間插入其他行程」等情境，
            // 只用顏色標示這是原本所在的日期，不阻擋點選。
            const [dateStr, dayStr] = label.split(' ')
            return (
              <button
                key={value}
                onClick={() => toggleDate(value, false)}
                className="rounded-xl border flex flex-col items-center justify-center gap-0.5"
                style={{
                  padding: '10px 4px',
                  background: isActive ? 'var(--accent)' : 'var(--mini-bg)',
                  color: isActive ? 'white' : isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                  borderColor: isActive ? 'var(--accent)' : isCurrent ? 'color-mix(in srgb, var(--accent) 60%, transparent)' : 'var(--mini-border)',
                  fontWeight: isActive || isCurrent ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                <span>{dayStr}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{dateStr}</span>
              </button>
            )
          })}
        </div>

        <button
          className="btn-primary w-full justify-center"
          disabled={selectedCount === 0 || confirming}
          onClick={async () => {
            if (confirming) return
            setConfirming(true)
            try {
              await onConfirm(selected)
            } finally {
              setConfirming(false)
            }
          }}
        >
          {isCopy ? <Copy size={16} /> : <MoveRight size={16} />}
          {isCopy
            ? `複製到 ${selectedCount} 天`
            : '移動到此日'}
        </button>
      </div>
    </div>
  )
}

function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export default function ActivityFormPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { id }      = useParams()
  const [searchParams] = useSearchParams()
  const isNew       = !id || id === 'new'
  const { activities, loading, addActivity, updateActivity } = useActivities()
  const [form, setForm]           = useState(emptyForm())
  const [isDraft, setIsDraft]     = useState(() => searchParams.get('draft') === '1')
  const [inputLang, setInputLang] = useState('zh')
  const [saving, setSaving]       = useState(false)
  const [askNext, setAskNext]     = useState(false)
  const [dateSheet, setDateSheet] = useState(null)
  const submitting = useRef(false)
  const lang = i18n.language

  // Detect time overlap with other confirmed activities on the same date
  const overlapWarning = useMemo(() => {
    if (!form.date || !form.startTime) return null
    const myStart = timeToMinutes(form.startTime)
    const myEnd   = form.endTime ? timeToMinutes(form.endTime) : myStart + 1
    if (myStart === null) return null
    const siblings = activities.filter(a =>
      a.id !== id &&
      a.date === form.date &&
      (a.status ?? 'confirmed') === 'confirmed' &&
      a.startTime &&
      !a.flightId &&                       // 航班佔位不參與重疊偵測
      !a._hotelAnchor &&                   // 飯店佔位不參與
      a.segmentId !== 'transit' &&         // 轉機段（可能有時差）不參與
      form.segmentId !== 'transit'         // 自己是轉機段時也不偵測
    )
    const overlapping = siblings.filter(a => {
      const aStart = timeToMinutes(a.startTime)
      const aEnd   = a.endTime ? timeToMinutes(a.endTime) : aStart + 1
      if (aStart === null) return false
      // 首尾相接（例如 10:00-12:00 接 12:00-14:00）視為合理銜接，不算重疊
      if (myStart >= aEnd || myEnd <= aStart) return false
      return true
    })
    if (overlapping.length === 0) return null
    const names = overlapping.map(a => {
      const title = a.title
      return (typeof title === 'object' ? (title.zh || title.en) : title) || '?'
    }).join('、')
    return lang === 'zh-TW'
      ? `時間與「${names}」重疊`
      : `Time overlaps with: ${names}`
  }, [form.date, form.startTime, form.endTime, activities, id, lang])

  useEffect(() => {
    if (!isNew) {
      const a = activities.find(x => x.id === id)
      if (a) {
        setIsDraft(a.status === 'draft')
        const hasTransportAfter = Object.prototype.hasOwnProperty.call(a, 'transportAfter')
        setForm({
          ...emptyForm(),
          ...a,
          link: a.link || a.mapLink || '',
          transportAfter: hasTransportAfter ? a.transportAfter : emptyForm().transportAfter,
        })
      }
    }
  }, [id, activities])

  const set = (path, value) => setForm(f => {
    const parts = path.split('.')
    if (parts.length === 1) return { ...f, [path]: value }
    if (parts.length === 2) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: value } }
    if (parts.length === 3) return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: { ...f[parts[0]][parts[1]], [parts[2]]: value } } }
    return f
  })

  const handleDateAction = async (targetDateOrDates) => {
    const mode = dateSheet
    setDateSheet(null)
    const targetDates = Array.isArray(targetDateOrDates)
      ? targetDateOrDates
      : [targetDateOrDates]

    const { mapLink, ...restForm } = form
    const buildData = (date) => ({
      ...restForm,
      date,
      link: normalizeExternalLink(form.link || form.mapLink),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      transportAfter: normalizeTransportAfterForSave(form.transportAfter),
    })

    try {
      if (mode === 'copy') {
        const copyDates = targetDates.filter(Boolean)
        if (copyDates.length === 0) return
        const refs = await Promise.all(copyDates.map(date => addActivity(buildData(date))))
        toast.success(`已複製到 ${copyDates.length} 天`)
        if (refs.length === 1) {
          navigate(`/trip/activities/${refs[0].id}/edit`)
        } else {
          navigate('/trip/activities')
        }
      } else {
        const targetDate = targetDates[0]
        if (!targetDate) return
        await updateActivity(id, { date: targetDate })
        toast.success(`已移動到 ${targetDate}`)
        navigate('/trip/activities')
      }
    } catch (err) {
      console.error('[ActivityFormPage] date action failed:', err.code, err.message)
      if (err.code === 'not-found') {
        toast.error('此活動已被刪除')
        navigate('/trip/activities')
      } else {
        toast.error('操作失敗')
      }
    }
  }

  const addBackupPlan = async () => {
    if (submitting.current) return
    submitting.current = true
    try {
      const newId = await addActivity({
        title: { zh: '', en: '' },
        location: { zh: '', en: '' },
        address: { zh: '', en: '' },
        note: { zh: '', en: '' },
        type: form.type,
        date: form.date,
        startTime: '', endTime: '',
        lat: null, lng: null, link: '',
        segmentId: form.segmentId, order: 0,
        images: [],
        status: 'confirmed',
        alternativeFor: id,
        transportAfter: { mode: 'none', durationMin: '', note: { zh: '', en: '' } },
      })
      navigate(`/trip/activities/${newId.id}/edit`)
    } catch (err) {
      console.error('[ActivityFormPage] add backup plan failed:', err.code, err.message)
      toast.error('新增失敗')
    } finally {
      submitting.current = false
    }
  }

  const submit = async () => {
    if (submitting.current) return
    if (!form.title.zh && !form.title.en) { toast.error('請輸入標題'); return }
    if (!isDraft && !form.date) { toast.error('請選擇日期'); return }
    submitting.current = true
    setSaving(true)
    const { mapLink, ...restForm } = form
    const data = {
      ...restForm,
      status: isDraft ? 'draft' : 'confirmed',
      link: normalizeExternalLink(form.link || form.mapLink),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      transportAfter: normalizeTransportAfterForSave(form.transportAfter),
    }
    try {
      if (isNew) {
        await addActivity(data)
        setSaving(false)
        setAskNext(true)
      } else {
        await updateActivity(id, data)
        toast.success('已儲存')
        navigate('/trip/activities')
      }
    } catch (err) {
      console.error('[ActivityFormPage] submit failed:', err.code, err.message)
      if (err.code === 'not-found') {
        toast.error('此活動已被刪除')
        navigate('/trip/activities')
        return
      }
      toast.error('儲存失敗')
      setSaving(false)
    } finally {
      submitting.current = false
    }
  }

  const notFound = !isNew && !loading && !activities.some(a => a.id === id)

  if (notFound) return (
    <div className="px-4 py-16 flex flex-col items-center text-center gap-3">
      <AlertTriangle size={40} style={{ color: 'var(--text-secondary)' }} />
      <p className="text-primary text-base font-medium">找不到這個活動</p>
      <p className="text-secondary text-sm">它可能已經被刪除或連結已失效</p>
      <button
        onClick={() => navigate('/trip/activities')}
        className="btn-primary mt-2"
      >回到活動行程</button>
    </div>
  )

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-primary font-medium text-xl">
          {isNew ? t('activities.new') : t('activities.edit')}
        </h2>
      </div>

      <div className="space-y-4">

        {form.alternativeFor && (
          <div className="glass-card p-4 flex items-center gap-2.5" style={{ background: 'color-mix(in srgb, #0ea5e9 6%, var(--glass-bg))', border: '0.5px solid color-mix(in srgb, #0ea5e9 30%, transparent)' }}>
            <CloudRain size={16} style={{ color: '#0369a1', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: '#0369a1' }}>這是雨備方案，會顯示在原活動卡片的展開內容中</p>
          </div>
        )}

        {/* Draft toggle */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-primary font-medium text-sm">許願清單模式</p>
            <p className="text-secondary text-xs mt-0.5">許願清單不顯示在正式行程，日期和時間可不填</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDraft(v => !v)}
            style={{
              width: 44, height: 26, borderRadius: 99, padding: 3, flexShrink: 0,
              background: isDraft ? 'var(--accent)' : 'var(--mini-border)',
              display: 'flex', alignItems: 'center',
              justifyContent: isDraft ? 'flex-end' : 'flex-start',
              transition: 'background 0.2s, justify-content 0.2s',
              border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <div className="glass-card p-4 space-y-3">
          <BilingualField
            label={lang === 'zh-TW' ? '標題' : 'Title'}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={form.title.zh} enValue={form.title.en}
            onZhChange={v => set('title.zh', v)} onEnChange={v => set('title.en', v)}
          />
          <BilingualField
            label={lang === 'zh-TW' ? '導航地址' : 'Navigation Address'}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={form.address.zh} enValue={form.address.en}
            onZhChange={v => set('address.zh', v)} onEnChange={v => set('address.en', v)}
            placeholder={lang === 'zh-TW' ? '貼上地址或地點名稱，導航用' : 'Paste address for navigation'}
          />
          <BilingualField
            label={lang === 'zh-TW' ? '顯示名稱（選填）' : 'Display Name (optional)'}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={form.location.zh} enValue={form.location.en}
            onZhChange={v => set('location.zh', v)} onEnChange={v => set('location.en', v)}
            placeholder={lang === 'zh-TW' ? '短名稱，例如：Diamond Head' : 'Short name, e.g. Diamond Head'}
          />
        </div>

        <div className="glass-card p-4 space-y-3">
          {/* Type */}
          <div className="space-y-1">
            <label className="text-secondary text-sm">{t('activities.fields.type')}</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(ty => (
                <button
                  key={ty}
                  onClick={() => set('type', ty)}
                  className="px-3 py-1.5 rounded-full text-sm border"
                  style={{
                    background: form.type === ty ? 'var(--accent)' : 'var(--mini-bg)',
                    color:      form.type === ty ? 'white'         : 'var(--text-secondary)',
                    borderColor: form.type === ty ? 'var(--accent)' : 'var(--mini-border)',
                  }}
                >{t(`activities.type.${ty}`)}</button>
              ))}
            </div>
          </div>

          {/* Segment */}
          <div className="space-y-1">
            <label className="text-secondary text-sm">國家</label>
            <div className="flex gap-2">
              {SEGMENTS.map(seg => (
                <button
                  key={seg.id}
                  onClick={() => set('segmentId', seg.id)}
                  className="px-3 py-1.5 rounded-full text-sm border"
                  style={{
                    background: form.segmentId === seg.id ? 'var(--accent)' : 'var(--mini-bg)',
                    color:      form.segmentId === seg.id ? 'white'         : 'var(--text-secondary)',
                    borderColor: form.segmentId === seg.id ? 'var(--accent)' : 'var(--mini-border)',
                  }}
                >{lang === 'zh-TW' ? seg.label.zh : seg.label.en}</button>
              ))}
            </div>
          </div>

          <SelectField
            label={`${t('activities.fields.date')}${isDraft ? '（選填）' : ''}`}
            value={form.date}
            onChange={v => set('date', v)}
            options={TRIP_DAYS}
          />
          <TimeSelect label={`${t('activities.fields.startTime')}${isDraft ? '（選填）' : ''}`} value={form.startTime} onChange={v => set('startTime', v)} />
          <TimeSelect label={`${t('activities.fields.endTime')}${isDraft ? '（選填）' : ''}`}   value={form.endTime}   onChange={v => set('endTime', v)} />
          {overlapWarning && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 10px', borderRadius: 10, background: 'color-mix(in srgb, #f59e0b 12%, transparent)', border: '0.5px solid color-mix(in srgb, #f59e0b 50%, transparent)' }}>
              <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: '#d97706', lineHeight: 1.4 }}>{overlapWarning}</span>
            </div>
          )}
        </div>

        <div className="glass-card p-4 space-y-3">
          <BilingualField
            label={lang === 'zh-TW' ? '備註' : 'Note'}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={form.note.zh} enValue={form.note.en}
            onZhChange={v => set('note.zh', v)} onEnChange={v => set('note.en', v)}
            multiline
            rows={5}
          />
          <AdvancedToggle>
            <InputField label={t('activities.fields.lat')}     value={form.lat}     onChange={v => set('lat', v)}     type="number" />
            <InputField label={t('activities.fields.lng')}     value={form.lng}     onChange={v => set('lng', v)}     type="number" />
            <InputField label={t('activities.fields.link')}    value={form.link}    onChange={v => set('link', v)}    type="url" placeholder="https://example.com" />
          </AdvancedToggle>
        </div>

        {/* Images */}
        <div className="glass-card p-4">
          <p className="text-primary font-medium mb-3">{t('activities.fields.images')}</p>
          <ImageUploader
            images={form.images}
            onChange={urls => set('images', urls)}
            storagePath={`trips/holo-oahu-2026/activities/${id || 'new'}`}
          />
        </div>

        {!isNew && (
          <div className="flex gap-2">
            <button
              className="btn-ghost flex-1 justify-center"
              onClick={() => setDateSheet('copy')}
              style={{ fontSize: 13 }}
            >
              <Copy size={15} />複製到其他日
            </button>
            <button
              className="btn-ghost flex-1 justify-center"
              onClick={() => setDateSheet('move')}
              style={{ fontSize: 13 }}
            >
              <MoveRight size={15} />移動到其他日
            </button>
          </div>
        )}

        {!isNew && !form.alternativeFor && (
          <button
            className="btn-ghost w-full justify-center"
            onClick={addBackupPlan}
            style={{ fontSize: 13 }}
          >
            <CloudRain size={15} />新增雨備方案
          </button>
        )}

        <div className="flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button className="btn-primary flex-1 justify-center" onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : t('common.save')}
          </button>
        </div>
      </div>

      {dateSheet && (
        <DatePickerSheet
          mode={dateSheet}
          currentDate={form.date}
          onConfirm={handleDateAction}
          onClose={() => setDateSheet(null)}
        />
      )}

      {askNext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card p-6 w-full max-w-sm space-y-4">
            <p className="text-primary font-medium text-lg">已新增！繼續新增下一筆？</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 justify-center"
                onClick={() => { setAskNext(false); navigate('/trip/activities') }}>
                完成
              </button>
              <button className="btn-primary flex-1 justify-center"
                onClick={() => { setAskNext(false); setForm(emptyForm()) }}>
                繼續新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

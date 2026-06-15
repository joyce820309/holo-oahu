import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Check, Loader2, Copy, MoveRight } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import ImageUploader from '../components/ImageUploader'
import toast from 'react-hot-toast'

const TYPES    = ['restaurant', 'attraction', 'beach', 'experience', 'other']
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
  lat: '', lng: '', mapLink: '', segmentId: 'hawaii', order: 0,
  images: [],
  transportAfter: { mode: 'none', durationMin: '', note: { zh: '', en: '' } },
})

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
          type="number" min="0" max="59"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onFocus={() => setOpen(true)}
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

function TimeSelect({ label, value, onChange }) {
  const [h, m] = value ? value.split(':') : ['', '']
  const setH = v => onChange(v ? `${v}:${m || '00'}` : '')
  const setM = v => onChange(h ? `${h}:${v}` : `00:${v}`)
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <CustomSelect value={h || ''} onChange={setH} options={HOURS.map(v => ({ value: v, label: `${v} 時` }))} placeholder="時" />
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

function BilingualField({ label, inputLang, setInputLang, zhValue, enValue, onZhChange, onEnChange, type = 'text', placeholder }) {
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
      <input
        type={type}
        value={inputLang === 'zh' ? zhValue : enValue}
        onChange={e => inputLang === 'zh' ? onZhChange(e.target.value) : onEnChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

// 'copy' | 'move' | null
function DatePickerSheet({ mode, currentDate, onConfirm, onClose }) {
  const [selected, setSelected] = useState(currentDate || '')
  const isCopy = mode === 'copy'
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
            const isActive  = value === selected
            const isCurrent = value === currentDate
            const disabled  = isCurrent && !isCopy
            // label format: "07-18 第1天" → split at space
            const [dateStr, dayStr] = label.split(' ')
            return (
              <button
                key={value}
                onClick={() => !disabled && setSelected(value)}
                className="rounded-xl border flex flex-col items-center justify-center gap-0.5"
                style={{
                  padding: '10px 4px',
                  background: isActive ? 'var(--accent)' : 'var(--mini-bg)',
                  color: isActive ? 'white' : isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                  borderColor: isActive ? 'var(--accent)' : isCurrent ? 'color-mix(in srgb, var(--accent) 60%, transparent)' : 'var(--mini-border)',
                  fontWeight: isActive || isCurrent ? 600 : 400,
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
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
          disabled={!selected || (!isCopy && selected === currentDate)}
          onClick={() => onConfirm(selected)}
        >
          {isCopy ? <Copy size={16} /> : <MoveRight size={16} />}
          {isCopy ? '複製到此日' : '移動到此日'}
        </button>
      </div>
    </div>
  )
}

export default function ActivityFormPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { id }      = useParams()
  const [searchParams] = useSearchParams()
  const isNew       = !id || id === 'new'
  const { activities, addActivity, updateActivity } = useActivities()
  const [form, setForm]           = useState(emptyForm())
  const [isDraft, setIsDraft]     = useState(() => searchParams.get('draft') === '1')
  const [inputLang, setInputLang] = useState('zh')
  const [saving, setSaving]       = useState(false)
  const [askNext, setAskNext]     = useState(false)
  const [dateSheet, setDateSheet] = useState(null)
  const submitting = useRef(false)
  const lang = i18n.language

  useEffect(() => {
    if (!isNew) {
      const a = activities.find(x => x.id === id)
      if (a) {
        setIsDraft(a.status === 'draft')
        setForm({
          ...emptyForm(),
          ...a,
          transportAfter: a.transportAfter || emptyForm().transportAfter,
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

  const handleDateAction = async (targetDate) => {
    const mode = dateSheet
    setDateSheet(null)
    const data = {
      ...form,
      date: targetDate,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      transportAfter: {
        ...form.transportAfter,
        durationMin: form.transportAfter.durationMin ? parseInt(form.transportAfter.durationMin) : 0,
      },
    }
    try {
      if (mode === 'copy') {
        await addActivity(data)
        toast.success(`已複製到 ${targetDate}`)
      } else {
        await updateActivity(id, { date: targetDate })
        toast.success(`已移動到 ${targetDate}`)
        navigate('/trip/activities')
      }
    } catch {
      toast.error('操作失敗')
    }
  }

  const submit = async () => {
    if (submitting.current) return
    if (!form.title.zh && !form.title.en) { toast.error('請輸入標題'); return }
    if (!isDraft && !form.date) { toast.error('請選擇日期'); return }
    submitting.current = true
    setSaving(true)
    const data = {
      ...form,
      status: isDraft ? 'draft' : 'confirmed',
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      transportAfter: {
        ...form.transportAfter,
        durationMin: form.transportAfter.durationMin ? parseInt(form.transportAfter.durationMin) : 0,
      },
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
    } catch {
      toast.error('儲存失敗')
      setSaving(false)
    } finally {
      submitting.current = false
    }
  }

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

        {/* Draft toggle */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-primary font-medium text-sm">草稿模式</p>
            <p className="text-secondary text-xs mt-0.5">草稿不顯示在正式行程，日期和時間可不填</p>
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
        </div>

        <div className="glass-card p-4 space-y-3">
          <BilingualField
            label={lang === 'zh-TW' ? '備註' : 'Note'}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={form.note.zh} enValue={form.note.en}
            onZhChange={v => set('note.zh', v)} onEnChange={v => set('note.en', v)}
          />
          <AdvancedToggle>
            <InputField label={t('activities.fields.lat')}     value={form.lat}     onChange={v => set('lat', v)}     type="number" />
            <InputField label={t('activities.fields.lng')}     value={form.lng}     onChange={v => set('lng', v)}     type="number" />
            <InputField label={t('activities.fields.mapLink')} value={form.mapLink} onChange={v => set('mapLink', v)} />
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

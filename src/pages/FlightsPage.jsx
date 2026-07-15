import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Plane, ChevronDown, Check, Trash2, Pencil, DoorOpen } from 'lucide-react'
import { useFlights } from '../hooks/useFlights'
import { useAuth } from '../contexts/AuthContext'
import { syncFlightToActivities, deleteFlightActivities } from '../lib/syncFlightActivities'
import ConfirmDialog from '../components/ConfirmDialog'
import ImageUploader from '../components/ImageUploader'
import { FlightsSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'

// ── Shared field components (must be at module level) ──────────────────────

const TRIP_START = new Date('2026-07-18')
const TRIP_DAYS  = Array.from({ length: 9 }, (_, i) => {
  const d = new Date(TRIP_START)
  d.setDate(d.getDate() + i)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { value: `2026-${mm}-${dd}`, label: `${mm}-${dd} 第${i + 1}天` }
})
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

function CustomSelect({ value, onChange, options, placeholder = '—' }) {
  const [open, setOpen]           = useState(false)
  const [dropPos, setDropPos]     = useState({ top: 0, left: 0, width: 0 })
  const [hoveredValue, setHovered] = useState(null)
  const triggerRef = useRef(null)
  const selectedLabel = options.find(o => o.value === value)?.label ?? ''

  const updateDropPos = () => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  useEffect(() => {
    const h = e => { if (!triggerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
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
    <div style={{
      position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
      zIndex: 9999, background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
    }}>
      <div style={{ maxHeight: 224, overflowY: 'auto', padding: '4px 0' }}>
        {options.map(o => {
          const isSel = o.value === value
          const isHov = o.value === hoveredValue
          return (
            <button key={o.value} type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
              onMouseEnter={() => setHovered(o.value)}
              onMouseLeave={() => setHovered(null)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left"
              style={{
                background: isSel ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : isHov ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                color: isSel ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: isSel ? 500 : 400,
              }}>
              <span>{o.label}</span>
              {isSel && <Check size={13} strokeWidth={2} style={{ color: 'var(--accent)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <>
      <div ref={triggerRef}>
        <button type="button" onClick={handleOpen}
          className="w-full glass-mini flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left"
          style={{
            background: 'var(--mini-bg)',
            border: open ? '0.5px solid var(--accent)' : '0.5px solid var(--mini-border)',
            color: selectedLabel ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
          }}>
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

function TimeSelect({ label, value, onChange }) {
  const [h, m] = value ? value.split(':') : ['', '']
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <CustomSelect value={h || ''} onChange={v => onChange(v ? `${v}:${m || '00'}` : '')} options={HOURS.map(v => ({ value: v, label: `${v} 時` }))} placeholder="時" />
        </div>
        <span className="text-secondary font-medium">:</span>
        <div className="flex-1">
          <CustomSelect value={m || ''} onChange={v => onChange(v ? `${h || '00'}:${v}` : '')} options={MINUTES.map(v => ({ value: v, label: `${v} 分` }))} placeholder="分" />
        </div>
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

function PillChip({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        gap: 4,
        background: 'color-mix(in srgb, var(--accent) 14%, var(--mini-bg))',
        color: 'var(--accent)',
        borderRadius: 9,
      }}
    >
      <DoorOpen size={11} strokeWidth={2} />
      {children}
    </span>
  )
}

function BilingualField({ label, inputLang, setInputLang, zhValue, enValue, onZhChange, onEnChange, placeholder }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-secondary text-sm">{label}</label>
        <div className="flex items-center gap-1">
          {['zh', 'en'].map(l => (
            <button key={l} type="button" onClick={() => setInputLang(l)}
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
        value={inputLang === 'zh' ? zhValue : enValue}
        onChange={e => inputLang === 'zh' ? onZhChange(e.target.value) : onEnChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

function AdvancedToggle({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between py-1">
        <span className="text-secondary text-sm">進階設定</span>
        <div style={{ width: 40, height: 22, borderRadius: 99, padding: 2, transition: 'background 0.2s', background: open ? 'var(--accent)' : 'var(--mini-border)', display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'flex-start' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </div>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

// ── Form ───────────────────────────────────────────────────────────────────

const emptyForm = () => ({
  flightNo: '', airline: '',
  from: { zh: '', en: '' }, to: { zh: '', en: '' },
  departDate: '', departTime: '', departTerminal: '',
  arriveDate: '', arriveTime: '', arriveTerminal: '',
  seat: '', confirmCode: '', note: '', images: [],
})

function FlightForm({ initial, onSave, onCancel, id }) {
  const { t } = useTranslation()
  const [inputLang, setInputLang] = useState('zh')
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm()
    // migrate legacy datetime-local strings
    const splitDT = (dt) => {
      if (!dt) return { date: '', time: '' }
      if (dt.includes('T')) {
        const [date, time] = dt.split('T')
        return { date, time: time?.slice(0, 5) || '' }
      }
      return { date: dt, time: '' }
    }
    const dep = splitDT(initial.departAt)
    const arr = splitDT(initial.arriveAt)
    // migrate legacy plain string from/to
    const normBi = v => (v && typeof v === 'object') ? v : { zh: v || '', en: '' }
    return {
      ...emptyForm(), ...initial,
      from: normBi(initial.from), to: normBi(initial.to),
      departDate: dep.date, departTime: dep.time,
      arriveDate: arr.date, arriveTime: arr.time,
    }
  })
  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setBi  = (k, lang, v) => setForm(f => ({ ...f, [k]: { ...f[k], [lang]: v } }))

  return (
    <div className="space-y-4">
      {/* 航班資訊 */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t('flights.fields.flightNo')} value={form.flightNo} onChange={v => set('flightNo', v)} placeholder="BR868" />
          <InputField label={t('flights.fields.airline')}  value={form.airline}  onChange={v => set('airline', v)}  placeholder="EVA Air" />
        </div>
        <BilingualField
          label={t('flights.fields.from')}
          inputLang={inputLang} setInputLang={setInputLang}
          zhValue={form.from.zh} enValue={form.from.en}
          onZhChange={v => setBi('from', 'zh', v)} onEnChange={v => setBi('from', 'en', v)}
          placeholder="出發地"
        />
        <BilingualField
          label={t('flights.fields.to')}
          inputLang={inputLang} setInputLang={setInputLang}
          zhValue={form.to.zh} enValue={form.to.en}
          onZhChange={v => setBi('to', 'zh', v)} onEnChange={v => setBi('to', 'en', v)}
          placeholder="目的地"
        />
      </div>

      {/* 出發 */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-primary font-medium text-sm">{t('flights.fields.departAt')}</p>
        <SelectField label={t('flights.fields.date')} value={form.departDate} onChange={v => set('departDate', v)} options={TRIP_DAYS} />
        <div className="grid grid-cols-2 gap-3">
          <TimeSelect label={t('flights.fields.time')} value={form.departTime} onChange={v => set('departTime', v)} />
          <InputField label={t('flights.fields.terminal')} value={form.departTerminal} onChange={v => set('departTerminal', v)} placeholder="T1 / T2" />
        </div>
      </div>

      {/* 抵達 */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-primary font-medium text-sm">{t('flights.fields.arriveAt')}</p>
        <SelectField label={t('flights.fields.date')} value={form.arriveDate} onChange={v => set('arriveDate', v)} options={TRIP_DAYS} />
        <div className="grid grid-cols-2 gap-3">
          <TimeSelect label={t('flights.fields.time')} value={form.arriveTime} onChange={v => set('arriveTime', v)} />
          <InputField label={t('flights.fields.terminal')} value={form.arriveTerminal} onChange={v => set('arriveTerminal', v)} placeholder="T1 / T2" />
        </div>
      </div>

      {/* 訂位資訊 + 進階 */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t('flights.fields.seat')}        value={form.seat}        onChange={v => set('seat', v)}        placeholder="32A" />
          <InputField label={t('flights.fields.confirmCode')} value={form.confirmCode} onChange={v => set('confirmCode', v)} placeholder="ABC123" />
        </div>
        <InputField label={t('flights.fields.note')} value={form.note} onChange={v => set('note', v)} />
      </div>

      {/* 圖片 */}
      <div className="glass-card p-4">
        <p className="text-primary font-medium text-sm mb-3">{t('activities.fields.images')}</p>
        <ImageUploader images={form.images} onChange={urls => set('images', urls)} storagePath={`trips/holo-oahu-2026/flights/${id || 'new'}`} />
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>{t('common.save')}</button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

export default function FlightsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { canEditTravel } = useAuth()
  const { flights, loading, addFlight, updateFlight, deleteFlight } = useFlights()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [delId, setDelId]       = useState(null)

  const handleSave = async (form) => {
    const data = {
      ...form,
      departAt: form.departDate && form.departTime ? `${form.departDate}T${form.departTime}` : form.departDate || '',
      arriveAt: form.arriveDate && form.arriveTime ? `${form.arriveDate}T${form.arriveTime}` : form.arriveDate || '',
    }
    try {
      let savedId = editId
      if (editId) { await updateFlight(editId, data); setEditId(null) }
      else        { const ref = await addFlight(data); savedId = ref.id; setShowForm(false) }
      await syncFlightToActivities(savedId, data)
      toast.success('已儲存')
    } catch { toast.error('儲存失敗') }
  }

  const handleSyncAll = async () => {
    try {
      await Promise.all(flights.map(f => syncFlightToActivities(f.id, f)))
      toast.success(`已同步 ${flights.length} 筆機票`)
    } catch { toast.error('同步失敗') }
  }

  const fmtDT = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    if (isNaN(d)) return dt
    return d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('flights.title')}</h2>
        {canEditTravel && (
          <div className="flex items-center gap-2">
            {flights.length > 0 && (
              <button className="btn-ghost text-sm" onClick={handleSyncAll}>
                同步行程
              </button>
            )}
            <button className="btn-primary" onClick={() => { setShowForm(s => !s); setEditId(null) }}>
              <Plus size={18} />{t('flights.new')}
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <FlightForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading && <FlightsSkeleton count={2} />}
      {!loading && flights.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('flights.noData')}</p>
      )}

      <div className="space-y-3">
        {flights.map(f => (
          <div key={f.id}>
            {editId === f.id ? (
              <FlightForm initial={f} onSave={handleSave} onCancel={() => setEditId(null)} id={f.id} />
            ) : (
              <div className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg glass-mini flex-shrink-0">
                    <Plane size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary font-medium">{f.flightNo}{f.airline ? ` · ${f.airline}` : ''}</p>
                    <p className="text-secondary text-sm mt-0.5">{bi(f.from, lang)} → {bi(f.to, lang)}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="glass-mini p-2 rounded-xl">
                        <p className="text-secondary text-xs">{t('flights.fields.departAt')}</p>
                        <p className="text-primary text-sm font-medium">{fmtDT(f.departAt)}</p>
                        {f.departTerminal && (
                          <div className="mt-1.5">
                            <PillChip>{`${t('flights.fields.terminal')} ${f.departTerminal}`}</PillChip>
                          </div>
                        )}
                      </div>
                      <div className="glass-mini p-2 rounded-xl">
                        <p className="text-secondary text-xs">{t('flights.fields.arriveAt')}</p>
                        <p className="text-primary text-sm font-medium">{fmtDT(f.arriveAt)}</p>
                        {f.arriveTerminal && (
                          <div className="mt-1.5">
                            <PillChip>{`${t('flights.fields.terminal')} ${f.arriveTerminal}`}</PillChip>
                          </div>
                        )}
                      </div>
                    </div>
                    {(f.seat || f.confirmCode) && (
                      <p className="text-secondary text-xs mt-2">
                        {f.seat && `座位 ${f.seat}`}{f.seat && f.confirmCode && '  ·  '}{f.confirmCode && `訂位代號 ${f.confirmCode}`}
                      </p>
                    )}
                    {f.images?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {f.images.map(url => <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />)}
                      </div>
                    )}
                  </div>
                  {canEditTravel && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'} onClick={() => { setEditId(f.id); setShowForm(false) }}>
                        <Pencil size={15} />
                      </button>
                      <button className="p-1.5 rounded-lg" style={{ color: 'var(--danger)', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'} onClick={() => setDelId(f.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {delId && (
        <ConfirmDialog
          onConfirm={async () => {
            await deleteFlight(delId)
            await deleteFlightActivities(delId)
            setDelId(null)
          }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}

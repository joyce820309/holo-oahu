import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Hotel, ChevronDown, Trash2, Pencil } from 'lucide-react'
import { useHotels } from '../hooks/useHotels'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import ImageUploader from '../components/ImageUploader'
import { HotelsSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'

// ── Shared field components (module level) ─────────────────────────────────

const TRIP_DAYS = Array.from({ length: 9 }, (_, i) => {
  const d = new Date('2026-07-18')
  d.setDate(d.getDate() + i)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { value: `2026-${mm}-${dd}`, label: `${mm}-${dd} 第${i + 1}天` }
})

const SEGMENTS = [
  { id: 'hawaii', zh: '夏威夷', en: 'Hawaii' },
  { id: 'seoul',  zh: '首爾',   en: 'Seoul'  },
]

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

function CustomSelect({ value, onChange, options, placeholder = '—' }) {
  const [open, setOpen]            = useState(false)
  const [dropPos, setDropPos]      = useState({ top: 0, left: 0, width: 0 })
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

function BilingualField({ label, inputLang, setInputLang, zhValue, enValue, onZhChange, onEnChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-secondary text-sm">{label}</label>
        <div className="flex items-center gap-1">
          {['zh', 'en'].map(l => (
            <button key={l} onClick={() => setInputLang(l)}
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
  name: { zh: '', en: '' }, address: { zh: '', en: '' },
  checkIn: '', checkOut: '', confirmCode: '', phone: '', note: '',
  lat: '', lng: '', segmentId: 'hawaii', images: [],
})

function HotelForm({ initial, onSave, onCancel, id }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [form, setForm]       = useState(initial ? { ...emptyForm(), ...initial } : emptyForm())
  const [inputLang, setInputLang] = useState('zh')

  const set = (path, value) => setForm(f => {
    const parts = path.split('.')
    if (parts.length === 1) return { ...f, [path]: value }
    return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: value } }
  })

  return (
    <div className="space-y-4">
      {/* 名稱 & 地址（雙語） */}
      <div className="glass-card p-4 space-y-3">
        <BilingualField
          label={t('hotels.fields.nameZh')?.replace('（中文）', '') || '名稱'}
          inputLang={inputLang} setInputLang={setInputLang}
          zhValue={form.name.zh} enValue={form.name.en}
          onZhChange={v => set('name.zh', v)} onEnChange={v => set('name.en', v)}
        />
        <BilingualField
          label={t('hotels.fields.addressZh')?.replace('（中文）', '') || '地址'}
          inputLang={inputLang} setInputLang={setInputLang}
          zhValue={form.address.zh} enValue={form.address.en}
          onZhChange={v => set('address.zh', v)} onEnChange={v => set('address.en', v)}
        />
      </div>

      {/* 日期 & 地點 */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label={t('hotels.fields.checkIn')}  value={form.checkIn}  onChange={v => set('checkIn', v)}  options={TRIP_DAYS} placeholder="選擇日期" />
          <SelectField label={t('hotels.fields.checkOut')} value={form.checkOut} onChange={v => set('checkOut', v)} options={TRIP_DAYS} placeholder="選擇日期" />
        </div>
        <div className="space-y-1">
          <label className="text-secondary text-sm">國家</label>
          <div className="flex gap-2">
            {SEGMENTS.map(seg => (
              <button key={seg.id} type="button" onClick={() => set('segmentId', seg.id)}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{
                  background:  form.segmentId === seg.id ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--mini-bg)',
                  borderColor: form.segmentId === seg.id ? 'var(--accent)' : 'var(--mini-border)',
                  color:       form.segmentId === seg.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight:  form.segmentId === seg.id ? 600 : 400,
                }}
              >{lang === 'zh-TW' ? seg.zh : seg.en}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 訂位資訊 */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t('hotels.fields.confirmCode')} value={form.confirmCode} onChange={v => set('confirmCode', v)} placeholder="ABC123" />
          <InputField label={t('hotels.fields.phone')}       value={form.phone}       onChange={v => set('phone', v)}       type="tel" placeholder="+1-808-xxx" />
        </div>
        <InputField label={t('hotels.fields.note')} value={form.note} onChange={v => set('note', v)} />
        <AdvancedToggle>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="緯度 Lat" value={form.lat} onChange={v => set('lat', v)} type="number" />
            <InputField label="經度 Lng" value={form.lng} onChange={v => set('lng', v)} type="number" />
          </div>
        </AdvancedToggle>
      </div>

      {/* 圖片 */}
      <div className="glass-card p-4">
        <p className="text-primary font-medium text-sm mb-3">圖片</p>
        <ImageUploader images={form.images} onChange={urls => set('images', urls)} storagePath={`trips/holo-oahu-2026/hotels/${id || 'new'}`} />
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>{t('common.save')}</button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function HotelsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { hotels, loading, addHotel, updateHotel, deleteHotel } = useHotels()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [delId, setDelId]       = useState(null)
  const lang = i18n.language

  const handleSave = async (form) => {
    const data = { ...form, lat: form.lat ? parseFloat(form.lat) : null, lng: form.lng ? parseFloat(form.lng) : null }
    try {
      if (editId) { await updateHotel(editId, data); setEditId(null) }
      else        { await addHotel(data); setShowForm(false) }
      toast.success('已儲存')
    } catch { toast.error('儲存失敗') }
  }

  if (loading) return (
    <div className="px-4 pb-36">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('hotels.title')}</h2>
      </div>
      <HotelsSkeleton count={2} />
    </div>
  )

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('hotels.title')}</h2>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setShowForm(s => !s); setEditId(null) }}>
            <Plus size={18} />{t('hotels.new')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <HotelForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {hotels.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('hotels.noData')}</p>
      )}

      <div className="space-y-3">
        {hotels.map(h => {
          const address = bi(h.address, lang)
          return (
            <div key={h.id}>
              {editId === h.id ? (
                <HotelForm initial={h} onSave={handleSave} onCancel={() => setEditId(null)} id={h.id} />
              ) : (
                <div
                  className="glass-card p-4 cursor-pointer"
                  onClick={() => navigate(`/trip/hotels/${h.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg glass-mini flex-shrink-0 mt-0.5">
                      <Hotel size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-primary font-medium text-base leading-snug">{bi(h.name, lang)}</p>
                      {address && <p className="text-secondary text-sm mt-0.5 truncate">{address}</p>}
                      {(h.checkIn || h.checkOut) && (
                        <p className="text-secondary text-xs mt-1">
                          {h.checkIn}{h.checkOut ? ` – ${h.checkOut}` : ''}
                        </p>
                      )}
                      {h.confirmCode && (
                        <p className="text-secondary text-xs mt-0.5">訂位代號 {h.confirmCode}</p>
                      )}

                      {h.images?.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {h.images.map(url => <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />)}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'}
                          onClick={e => { e.stopPropagation(); setEditId(h.id); setShowForm(false) }}>
                          <Pencil size={15} />
                        </button>
                        <button className="p-1.5 rounded-lg" style={{ color: '#e05555', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'}
                          onClick={e => { e.stopPropagation(); setDelId(h.id) }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteHotel(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}

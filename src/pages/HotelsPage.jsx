import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Hotel, Copy, Map, Phone, Check } from 'lucide-react'
import { useHotels } from '../hooks/useHotels'
import ConfirmDialog from '../components/ConfirmDialog'
import ImageUploader from '../components/ImageUploader'
import toast from 'react-hot-toast'

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

const emptyForm = () => ({
  name: { zh: '', en: '' }, address: { zh: '', en: '' },
  checkIn: '', checkOut: '', confirmCode: '', phone: '', note: '',
  lat: '', lng: '', segmentId: 'hawaii', images: [],
})

const SEGMENTS = [{ id: 'hawaii', zh: '夏威夷', en: 'Hawaii' }, { id: 'seoul', zh: '首爾', en: 'Seoul' }]

function HotelForm({ initial, onSave, onCancel, id }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [form, setForm] = useState(initial ? { ...emptyForm(), ...initial } : emptyForm())
  const set = (path, value) => setForm(f => {
    const parts = path.split('.')
    if (parts.length === 1) return { ...f, [path]: value }
    return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: value } }
  })

  const Input = ({ label, value, onChange, type = 'text' }) => (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )

  return (
    <div className="space-y-3">
      <Input label={t('hotels.fields.nameZh')}      value={form.name.zh}      onChange={v => set('name.zh', v)} />
      <Input label={t('hotels.fields.nameEn')}      value={form.name.en}      onChange={v => set('name.en', v)} />
      <Input label={t('hotels.fields.addressZh')}   value={form.address.zh}   onChange={v => set('address.zh', v)} />
      <Input label={t('hotels.fields.addressEn')}   value={form.address.en}   onChange={v => set('address.en', v)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('hotels.fields.checkIn')}     value={form.checkIn}     onChange={v => set('checkIn', v)}     type="date" />
        <Input label={t('hotels.fields.checkOut')}    value={form.checkOut}    onChange={v => set('checkOut', v)}    type="date" />
      </div>
      <Input label={t('hotels.fields.confirmCode')} value={form.confirmCode} onChange={v => set('confirmCode', v)} />
      <Input label={t('hotels.fields.phone')}       value={form.phone}       onChange={v => set('phone', v)}       type="tel" />
      <Input label={t('hotels.fields.note')}        value={form.note}        onChange={v => set('note', v)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Lat" value={form.lat} onChange={v => set('lat', v)} type="number" />
        <Input label="Lng" value={form.lng} onChange={v => set('lng', v)} type="number" />
      </div>
      <div className="flex gap-2">
        {SEGMENTS.map(seg => (
          <button key={seg.id} onClick={() => set('segmentId', seg.id)}
            className="px-3 py-1.5 rounded-full text-sm border"
            style={{
              background: form.segmentId === seg.id ? 'var(--accent)' : 'var(--mini-bg)',
              color:      form.segmentId === seg.id ? 'white'         : 'var(--text-secondary)',
              borderColor: form.segmentId === seg.id ? 'var(--accent)' : 'var(--mini-border)',
            }}
          >{lang === 'zh-TW' ? seg.zh : seg.en}</button>
        ))}
      </div>
      <ImageUploader
        images={form.images}
        onChange={urls => set('images', urls)}
        storagePath={`trips/holo-oahu-2025/hotels/${id || 'new'}`}
      />
      <div className="flex gap-3 pt-2">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>{t('common.save')}</button>
      </div>
    </div>
  )
}

export default function HotelsPage() {
  const { t, i18n } = useTranslation()
  const { hotels, loading, addHotel, updateHotel, deleteHotel } = useHotels()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [delId, setDelId]       = useState(null)
  const [copied, setCopied]     = useState(null)
  const lang = i18n.language

  const copyAddress = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id); toast.success(t('common.copied'))
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const handleSave = async (form) => {
    const data = { ...form, lat: form.lat ? parseFloat(form.lat) : null, lng: form.lng ? parseFloat(form.lng) : null }
    try {
      if (editId) { await updateHotel(editId, data); setEditId(null) }
      else        { await addHotel(data); setShowForm(false) }
      toast.success(t('common.save'))
    } catch { toast.error('儲存失敗') }
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('hotels.title')}</h2>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={18} />{t('hotels.new')}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 mb-4">
          <HotelForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading && <p className="text-secondary text-center py-8">{t('common.loading')}</p>}
      {!loading && hotels.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('hotels.noData')}</p>
      )}

      <div className="space-y-3">
        {hotels.map(h => {
          const address = bi(h.address, lang)
          return (
            <div key={h.id} className="glass-card p-4">
              {editId === h.id ? (
                <HotelForm initial={h} onSave={handleSave} onCancel={() => setEditId(null)} id={h.id} />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-primary font-medium text-base">{bi(h.name, lang)}</p>
                      <p className="text-secondary text-sm mt-0.5">{address}</p>
                      <p className="text-secondary text-sm">{h.checkIn} – {h.checkOut}</p>
                      {h.confirmCode && <p className="text-secondary text-xs mt-1">{t('hotels.fields.confirmCode')}: {h.confirmCode}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-ghost text-xs px-2 py-1" style={{ minHeight: 36 }} onClick={() => setEditId(h.id)}>{t('common.edit')}</button>
                      <button className="text-secondary text-xs p-2" onClick={() => setDelId(h.id)}>{t('common.delete')}</button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {address && (
                      <button className="btn-ghost text-xs px-3 py-1.5" style={{ minHeight: 36 }} onClick={() => copyAddress(address, h.id)}>
                        {copied === h.id ? <Check size={14} /> : <Copy size={14} />}
                        {t('common.copy')}
                      </button>
                    )}
                    {h.lat && h.lng && (
                      <button className="btn-ghost text-xs px-3 py-1.5" style={{ minHeight: 36 }}
                        onClick={() => window.open(`https://maps.google.com/?q=${h.lat},${h.lng}`)}>
                        <Map size={14} />{t('common.openMap')}
                      </button>
                    )}
                    {h.phone && (
                      <a href={`tel:${h.phone}`} className="btn-ghost text-xs px-3 py-1.5 no-underline" style={{ minHeight: 36 }}>
                        <Phone size={14} />{t('common.call')} {h.phone}
                      </a>
                    )}
                  </div>

                  {h.images?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {h.images.map(url => <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />)}
                    </div>
                  )}
                </>
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

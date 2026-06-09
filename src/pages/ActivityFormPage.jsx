import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import ImageUploader from '../components/ImageUploader'
import toast from 'react-hot-toast'

const TYPES    = ['restaurant', 'attraction', 'beach', 'experience', 'other']
const SEGMENTS = [{ id: 'hawaii', label: { zh: '夏威夷', en: 'Hawaii' } }, { id: 'seoul', label: { zh: '首爾', en: 'Seoul' } }]
const TRANSPORT_MODES = ['none', 'car', 'bus', 'taxi', 'walk', 'shuttle']

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

export default function ActivityFormPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { id }      = useParams()
  const isNew       = !id || id === 'new'
  const { activities, addActivity, updateActivity } = useActivities()
  const [form, setForm] = useState(emptyForm())
  const lang = i18n.language

  useEffect(() => {
    if (!isNew) {
      const a = activities.find(x => x.id === id)
      if (a) {
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

  const submit = async () => {
    if (!form.title.zh && !form.title.en) { toast.error('請輸入標題'); return }
    if (!form.date) { toast.error('請選擇日期'); return }
    const data = {
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      transportAfter: {
        ...form.transportAfter,
        durationMin: form.transportAfter.durationMin ? parseInt(form.transportAfter.durationMin) : 0,
      },
    }
    try {
      if (isNew) await addActivity(data)
      else await updateActivity(id, data)
      toast.success(isNew ? '已新增' : '已儲存')
      navigate('/trip/activities')
    } catch { toast.error('儲存失敗') }
  }

  const InputField = ({ label, value, onChange, type = 'text', placeholder }) => (
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

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-primary font-medium text-xl">
          {isNew ? t('activities.new') : t('activities.edit')}
        </h2>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-4 space-y-3">
          <InputField label={t('activities.fields.titleZh')}    value={form.title.zh}    onChange={v => set('title.zh', v)} />
          <InputField label={t('activities.fields.titleEn')}    value={form.title.en}    onChange={v => set('title.en', v)} />
          <InputField label={t('activities.fields.locationZh')} value={form.location.zh} onChange={v => set('location.zh', v)} />
          <InputField label={t('activities.fields.locationEn')} value={form.location.en} onChange={v => set('location.en', v)} />
          <InputField label={t('activities.fields.addressZh')}  value={form.address.zh}  onChange={v => set('address.zh', v)} />
          <InputField label={t('activities.fields.addressEn')}  value={form.address.en}  onChange={v => set('address.en', v)} />
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
            <label className="text-secondary text-sm">段落</label>
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

          <InputField label={t('activities.fields.date')}      placeholder="YYYY-MM-DD" value={form.date}      onChange={v => set('date', v)} />
          <InputField label={t('activities.fields.startTime')} placeholder="HH:mm"     value={form.startTime} onChange={v => set('startTime', v)} />
          <InputField label={t('activities.fields.endTime')}   placeholder="HH:mm"     value={form.endTime}   onChange={v => set('endTime', v)} />
        </div>

        <div className="glass-card p-4 space-y-3">
          <InputField label={t('activities.fields.noteZh')} value={form.note.zh} onChange={v => set('note.zh', v)} />
          <InputField label={t('activities.fields.noteEn')} value={form.note.en} onChange={v => set('note.en', v)} />
          <InputField label={t('activities.fields.lat')}     value={form.lat}     onChange={v => set('lat', v)}     type="number" />
          <InputField label={t('activities.fields.lng')}     value={form.lng}     onChange={v => set('lng', v)}     type="number" />
          <InputField label={t('activities.fields.mapLink')} value={form.mapLink} onChange={v => set('mapLink', v)} />
        </div>

        {/* Transport */}
        <div className="glass-card p-4 space-y-3">
          <p className="text-primary font-medium">{t('activities.transport.title')}</p>
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_MODES.map(mode => (
              <button key={mode} onClick={() => set('transportAfter.mode', mode)}
                className="px-3 py-1.5 rounded-full text-sm border"
                style={{
                  background: form.transportAfter.mode === mode ? 'var(--accent)' : 'var(--mini-bg)',
                  color:      form.transportAfter.mode === mode ? 'white'         : 'var(--text-secondary)',
                  borderColor: form.transportAfter.mode === mode ? 'var(--accent)' : 'var(--mini-border)',
                }}
              >{t(`activities.transport.mode.${mode}`)}</button>
            ))}
          </div>
          {form.transportAfter.mode !== 'none' && (
            <>
              <InputField
                label={`${t('activities.transport.title')} (${t('activities.transport.duration')})`}
                type="number"
                value={form.transportAfter.durationMin}
                onChange={v => set('transportAfter.durationMin', v)}
              />
              <InputField label={t('activities.transport.noteZh')} value={form.transportAfter.note.zh} onChange={v => set('transportAfter.note.zh', v)} />
              <InputField label={t('activities.transport.noteEn')} value={form.transportAfter.note.en} onChange={v => set('transportAfter.note.en', v)} />
            </>
          )}
        </div>

        {/* Images */}
        <div className="glass-card p-4">
          <p className="text-primary font-medium mb-3">{t('activities.fields.images')}</p>
          <ImageUploader
            images={form.images}
            onChange={urls => set('images', urls)}
            storagePath={`trips/holo-oahu-2025/activities/${id || 'new'}`}
          />
        </div>

        <div className="flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button className="btn-primary flex-1 justify-center" onClick={submit}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
}

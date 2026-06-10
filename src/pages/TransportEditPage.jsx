import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Car, Bus, Footprints, Truck, BanIcon } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import toast from 'react-hot-toast'

const MODES = [
  { id: 'none',    labelZh: '無',   labelEn: 'None',    Icon: BanIcon },
  { id: 'car',     labelZh: '自駕', labelEn: 'Drive',   Icon: Car },
  { id: 'bus',     labelZh: '公車', labelEn: 'Bus',     Icon: Bus },
  { id: 'taxi',    labelZh: '計程車', labelEn: 'Taxi',  Icon: Car },
  { id: 'walk',    labelZh: '步行', labelEn: 'Walk',    Icon: Footprints },
  { id: 'shuttle', labelZh: '接駁', labelEn: 'Shuttle', Icon: Truck },
]

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

export default function TransportEditPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { activities, updateActivity } = useActivities()
  const lang = i18n.language

  const activity = activities.find(a => a.id === id)
  const [form, setForm] = useState({
    mode: 'none', durationMin: '', note: { zh: '', en: '' },
  })
  const [inputLang, setInputLang] = useState('zh')

  useEffect(() => {
    if (activity?.transportAfter) {
      setForm({
        mode: activity.transportAfter.mode || 'none',
        durationMin: activity.transportAfter.durationMin || '',
        note: activity.transportAfter.note || { zh: '', en: '' },
      })
    }
  }, [activity])

  if (!activity) return (
    <div className="px-4 py-8 text-center">
      <p className="text-secondary">{t('common.loading')}</p>
    </div>
  )

  const submit = async () => {
    try {
      await updateActivity(id, {
        ...activity,
        transportAfter: {
          mode: form.mode,
          durationMin: form.durationMin ? parseInt(form.durationMin) : 0,
          note: form.note,
        },
      })
      toast.success('已儲存')
      navigate(-1)
    } catch { toast.error('儲存失敗') }
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-primary font-medium text-xl">離開後的交通</h2>
      </div>

      {/* Context: from → to */}
      <div className="glass-card p-4 mb-4 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-secondary text-xs mb-0.5">離開</p>
          <p className="text-primary text-sm font-medium truncate">{bi(activity.title, lang)}</p>
        </div>
        <div className="text-secondary text-lg px-2">→</div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-secondary text-xs mb-0.5">前往下一站</p>
          <p className="text-secondary text-sm">—</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Mode selector */}
        <div className="glass-card p-4 space-y-3">
          <label className="text-secondary text-sm">交通方式</label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ id: modeId, labelZh, labelEn, Icon }) => {
              const active = form.mode === modeId
              return (
                <button
                  key={modeId}
                  onClick={() => setForm(f => ({ ...f, mode: modeId }))}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm border transition-colors"
                  style={{
                    background:  active ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--mini-bg)',
                    borderColor: active ? 'var(--accent)' : 'var(--mini-border)',
                    color:       active ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight:  active ? 600 : 400,
                  }}
                >
                  <Icon size={18} />
                  {lang === 'zh-TW' ? labelZh : labelEn}
                </button>
              )
            })}
          </div>
        </div>

        {/* Duration + note — only when mode is set */}
        {form.mode !== 'none' && (
          <div className="glass-card p-4 space-y-3">
            {/* Duration */}
            <div className="space-y-1">
              <label className="text-secondary text-sm">所需時間（分鐘）</label>
              <input
                type="number"
                value={form.durationMin}
                onChange={e => setForm(f => ({ ...f, durationMin: e.target.value }))}
                placeholder="例：25"
                className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
                style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Note bilingual */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-secondary text-sm">備註</label>
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
                type="text"
                value={inputLang === 'zh' ? form.note.zh : form.note.en}
                onChange={e => setForm(f => ({ ...f, note: { ...f.note, [inputLang === 'zh' ? 'zh' : 'en']: e.target.value } }))}
                className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
                style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button className="btn-primary flex-1 justify-center" onClick={submit}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
}

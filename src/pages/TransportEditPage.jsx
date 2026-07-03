import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Car, Bus, Footprints, Truck, BanIcon, Bed, X } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import { useHotels } from '../hooks/useHotels'
import toast from 'react-hot-toast'

export const MODES = [
  { id: 'car',     labelZh: '自駕', labelEn: 'Drive',   Icon: Car },
  { id: 'bus',     labelZh: '公車', labelEn: 'Bus',     Icon: Bus },
  { id: 'taxi',    labelZh: '計程車', labelEn: 'Taxi',  Icon: Car },
  { id: 'walk',    labelZh: '步行', labelEn: 'Walk',    Icon: Footprints },
  { id: 'shuttle', labelZh: '接駁', labelEn: 'Shuttle', Icon: Truck },
  { id: 'none',    labelZh: '隱藏', labelEn: 'Hidden',  Icon: BanIcon },
]

// 向下相容：舊格式是單一物件，新格式是陣列
export function normalizeTransport(transportAfter) {
  if (!transportAfter) return []
  if (Array.isArray(transportAfter)) return transportAfter.filter(t => t.mode && t.mode !== 'none')
  if (transportAfter.mode && transportAfter.mode !== 'none') return [transportAfter]
  return []
}

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

function emptyEntry(mode) {
  return { mode, durationMin: '', note: { zh: '', en: '' } }
}

export default function TransportEditPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { activities, updateActivity } = useActivities()
  const { hotels } = useHotels()
  const lang = i18n.language

  const activity = activities.find(a => a.id === id)

  const eveningHotel = useMemo(() => {
    if (!activity?.date) return null
    return hotels.find(h => h.tripAnchor?.[activity.date]?.evening) ?? null
  }, [activity, hotels])

  const morningHotel = useMemo(() => {
    if (!activity?.date) return null
    return hotels.find(h => h.tripAnchor?.[activity.date]?.morning) ?? null
  }, [activity, hotels])

  // entries: [{ mode, durationMin, note }]  — one per selected mode
  const [entries, setEntries] = useState([])
  // hidden: true means mode=none (no transport shown)
  const [hidden, setHidden] = useState(false)
  const [inputLang, setInputLang] = useState('zh')

  useEffect(() => {
    if (!activity) return
    const ta = activity.transportAfter
    if (!ta) { setEntries([]); setHidden(false); return }
    if (Array.isArray(ta)) {
      const isHidden = ta.some(t => t.mode === 'none')
      setHidden(isHidden)
      setEntries(ta.filter(t => t.mode !== 'none').map(t => ({
        mode: t.mode, durationMin: t.durationMin ?? '', note: t.note || { zh: '', en: '' },
      })))
    } else {
      if (ta.mode === 'none') { setHidden(true); setEntries([]) }
      else { setHidden(false); setEntries([{ mode: ta.mode, durationMin: ta.durationMin ?? '', note: ta.note || { zh: '', en: '' } }]) }
    }
  }, [activity])

  if (!activity) return (
    <div className="px-4 py-8 text-center">
      <p className="text-secondary">{t('common.loading')}</p>
    </div>
  )

  const selectedModes = entries.map(e => e.mode)

  const toggleMode = (modeId) => {
    if (modeId === 'none') {
      setHidden(h => !h)
      setEntries([])
      return
    }
    setHidden(false)
    if (selectedModes.includes(modeId)) {
      setEntries(prev => prev.filter(e => e.mode !== modeId))
    } else {
      setEntries(prev => [...prev, emptyEntry(modeId)])
    }
  }

  const updateEntry = (modeId, field, value) => {
    setEntries(prev => prev.map(e => e.mode === modeId ? { ...e, [field]: value } : e))
  }
  const updateEntryNote = (modeId, langKey, value) => {
    setEntries(prev => prev.map(e =>
      e.mode === modeId ? { ...e, note: { ...e.note, [langKey]: value } } : e
    ))
  }

  const submit = async () => {
    try {
      let value
      if (hidden) {
        value = [{ mode: 'none' }]
      } else if (entries.length === 0) {
        value = null
      } else {
        value = entries.map(e => ({
          mode: e.mode,
          durationMin: e.durationMin ? parseInt(e.durationMin) : 0,
          note: e.note,
        }))
      }
      await updateActivity(id, { transportAfter: value })
      toast.success('已儲存')
      navigate(-1)
    } catch { toast.error('儲存失敗') }
  }

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-primary font-medium text-xl">離開後的交通</h2>
      </div>

      {/* Context card */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-secondary text-xs mb-0.5">離開</p>
            <p className="text-primary text-sm font-medium truncate">{bi(activity.title, lang)}</p>
            {morningHotel && (
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <Bed size={11} />從住宿出發
              </p>
            )}
          </div>
          <div className="text-secondary text-lg px-2">→</div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-secondary text-xs mb-0.5">前往下一站</p>
            {eveningHotel
              ? <p className="text-sm font-medium truncate" style={{ color: 'var(--accent)' }}>{bi(eveningHotel.name, lang)}</p>
              : <p className="text-secondary text-sm">—</p>
            }
          </div>
        </div>

        {eveningHotel && (
          <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid var(--mini-border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Bed size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>已設為今晚住宿終點</p>
              </div>
              <button
                onClick={() => {
                  const hotelName = bi(eveningHotel.name, lang)
                  const hotelAddr = bi(eveningHotel.address, lang)
                  const note = hotelAddr ? `${hotelName}（${hotelAddr}）` : hotelName
                  setEntries(prev =>
                    prev.length > 0
                      ? prev.map((e, i) => i === 0 ? { ...e, note: { zh: note, en: note } } : e)
                      : [{ ...emptyEntry('car'), note: { zh: note, en: note } }]
                  )
                  toast.success('已帶入飯店資訊')
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: 'var(--accent)',
                  border: '0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Bed size={12} />帶入備註
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Mode selector — multi-select */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-secondary text-sm">交通方式（可多選）</label>
            {(entries.length > 0 || hidden) && (
              <button
                onClick={() => { setEntries([]); setHidden(false) }}
                className="text-xs"
                style={{ color: 'var(--text-secondary)', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >清除全部</button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ id: modeId, labelZh, labelEn, Icon }) => {
              const active = modeId === 'none' ? hidden : selectedModes.includes(modeId)
              return (
                <button
                  key={modeId}
                  onClick={() => toggleMode(modeId)}
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
          {entries.length === 0 && !hidden && (
            <p className="text-secondary text-xs text-center pt-1">可多選；選「隱藏」則不顯示交通區段</p>
          )}
        </div>

        {/* Per-mode detail cards */}
        {entries.map((entry) => {
          const meta = MODES.find(m => m.id === entry.mode)
          const Icon = meta?.Icon
          return (
            <div key={entry.mode} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={15} style={{ color: 'var(--accent)' }} />}
                  <span className="text-primary text-sm font-medium">
                    {lang === 'zh-TW' ? meta?.labelZh : meta?.labelEn}
                  </span>
                </div>
                <button
                  onClick={() => setEntries(prev => prev.filter(e => e.mode !== entry.mode))}
                  className="p-1 rounded-lg text-secondary"
                  style={{ transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                ><X size={15} /></button>
              </div>

              <div className="space-y-1">
                <label className="text-secondary text-sm">所需時間（分鐘）</label>
                <input
                  type="number"
                  value={entry.durationMin}
                  onChange={e => updateEntry(entry.mode, 'durationMin', e.target.value)}
                  placeholder="例：25"
                  className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
                  style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
                />
              </div>

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
                  value={inputLang === 'zh' ? entry.note.zh : entry.note.en}
                  onChange={e => updateEntryNote(entry.mode, inputLang === 'zh' ? 'zh' : 'en', e.target.value)}
                  className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
                  style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )
        })}

        <div className="flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button className="btn-primary flex-1 justify-center" onClick={submit}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  )
}

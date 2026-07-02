import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Hotel, MapPin, Phone, Sunrise, Sunset, ChevronDown, Bed } from 'lucide-react'
import { useHotels } from '../hooks/useHotels'
import { useActivities } from '../hooks/useActivities'
import { HotelsSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

function DetailRow({ label, value, onCopy, copied, icon: Icon }) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b" style={{ borderColor: 'var(--mini-border)' }}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && <Icon size={17} className="text-secondary flex-shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="text-secondary text-xs mb-0.5">{label}</p>
          <p className="text-primary text-sm leading-relaxed break-words">{value}</p>
        </div>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="glass-mini inline-flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
          aria-label={`copy ${label}`}
        >
          {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} className="text-secondary" />}
        </button>
      )}
    </div>
  )
}

// 用本地時間格式化，避免 toISOString() UTC 偏移造成日期少一天
function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// 產生 checkIn ~ checkOut 之間每一天（含 checkIn 和 checkOut，退房日要顯示「早」）
function stayDates(checkIn, checkOut) {
  if (!checkIn) return []
  const dates = []
  const cur = new Date(`${checkIn}T00:00:00`)
  const end = checkOut ? new Date(`${checkOut}T00:00:00`) : new Date(cur.getTime() + 86400000)
  while (cur <= end) {
    dates.push(fmtDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

export default function HotelDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { hotels, loading, updateHotel } = useHotels()
  const { activities, addActivity, deleteActivity } = useActivities()
  const [copiedField, setCopiedField] = useState(null)
  const [anchorOpen, setAnchorOpen] = useState(false)
  const lang = i18n.language

  const hotel = hotels.find(h => h.id === id)

  const dates = useMemo(() => hotel ? stayDates(hotel.checkIn, hotel.checkOut) : [], [hotel])

  const anchor = hotel?.tripAnchor ?? {}

  const hotelName = hotel ? bi(hotel.name, lang) : ''
  const hotelAddr = hotel ? bi(hotel.address, lang) : ''
  const hotelLabel = hotelAddr ? `${hotelName}（${hotelAddr}）` : hotelName

  const toggleAnchor = async (date, slot) => {
    const cur = anchor[date] ?? {}
    const willEnable = !cur[slot]
    const next = { ...anchor, [date]: { ...cur, [slot]: willEnable } }

    try {
      await updateHotel(id, { tripAnchor: next })

      // 同步新增/刪除佔位活動
      const titleZh = slot === 'morning' ? '從住宿出發' : '返回住宿'
      const titleEn = slot === 'morning' ? 'Depart from hotel' : 'Return to hotel'
      const startTime = slot === 'morning' ? '08:00' : '21:00'

      if (willEnable) {
        await addActivity({
          title: { zh: titleZh, en: titleEn },
          date,
          startTime,
          endTime: '',
          location: { zh: hotelLabel, en: hotelLabel },
          address:  { zh: hotelAddr, en: hotelAddr },
          note: { zh: '', en: '' },
          type: 'accommodation',
          category: 'accommodation',
          status: 'confirmed',
          _hotelAnchor: { hotelId: id, slot },
        })
        toast.success('已新增到行程')
      } else {
        // 找到並刪除對應的佔位活動
        const existing = activities.find(a =>
          a._hotelAnchor?.hotelId === id &&
          a._hotelAnchor?.slot === slot &&
          a.date === date
        )
        if (existing) await deleteActivity(existing.id)
        toast.success('已從行程移除')
      }
    } catch { toast.error('操作失敗') }
  }

  const copyValue = (field, value) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field)
      toast.success(t('common.copied'))
      setTimeout(() => setCopiedField(null), 1800)
    })
  }

  if (loading) {
    return (
      <div className="px-4 pb-36">
        <div className="py-4">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
            <ArrowLeft size={20} />
          </button>
        </div>
        <HotelsSkeleton count={1} />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-secondary">{t('hotels.noData')}</p>
      </div>
    )
  }

  const name = bi(hotel.name, lang)
  const address = bi(hotel.address, lang)

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-primary font-medium text-xl">{t('hotels.title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl glass-mini flex-shrink-0">
              <Hotel size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-primary font-semibold text-lg leading-snug">{name}</h3>
              {(hotel.checkIn || hotel.checkOut) && (
                <p className="text-secondary text-sm mt-1">
                  {hotel.checkIn}{hotel.checkOut ? ` - ${hotel.checkOut}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <DetailRow
            label={lang === 'zh-TW' ? '飯店名稱' : 'Hotel name'}
            value={name}
            icon={Hotel}
            copied={copiedField === 'name'}
            onCopy={() => copyValue('name', name)}
          />
          <DetailRow
            label={lang === 'zh-TW' ? '地址' : 'Address'}
            value={address}
            icon={MapPin}
            copied={copiedField === 'address'}
            onCopy={() => copyValue('address', address)}
          />
          <DetailRow
            label={t('hotels.fields.phone')}
            value={hotel.phone}
            icon={Phone}
            copied={copiedField === 'phone'}
            onCopy={() => copyValue('phone', hotel.phone)}
          />
          <DetailRow label={t('hotels.fields.confirmCode')} value={hotel.confirmCode} />
          <DetailRow label={t('hotels.fields.note')} value={hotel.note} />
        </div>

        {hotel.images?.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-3">
              {t('activities.fields.images')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {hotel.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* ── Trip anchor ── */}
        {dates.length > 0 && (
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setAnchorOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                  <Bed size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-left">
                  <p className="text-primary text-sm font-medium">設為行程起終點</p>
                  <p className="text-secondary text-xs mt-0.5">勾選後可在活動交通頁快速帶入飯店資訊</p>
                </div>
              </div>
              <ChevronDown
                size={16}
                style={{
                  color: 'var(--text-secondary)',
                  transform: anchorOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              />
            </button>

            {anchorOpen && (
              <div style={{ borderTop: '0.5px solid var(--mini-border)' }}>
                {/* Header row */}
                <div className="grid px-4 py-2" style={{ gridTemplateColumns: '1fr 72px 72px', gap: 8 }}>
                  <span className="text-secondary text-xs">日期</span>
                  <span className="text-secondary text-xs text-center flex items-center justify-center gap-1">
                    <Sunrise size={11} />早
                  </span>
                  <span className="text-secondary text-xs text-center flex items-center justify-center gap-1">
                    <Sunset size={11} />晚
                  </span>
                </div>

                {dates.map((date, i) => {
                  const d = new Date(`${date}T00:00:00`)
                  const mm = String(d.getMonth() + 1).padStart(2, '0')
                  const dd = String(d.getDate()).padStart(2, '0')
                  const wd = WEEKDAY_ZH[d.getDay()]
                  const isLast = i === dates.length - 1
                  const morning = anchor[date]?.morning ?? false
                  const evening = anchor[date]?.evening ?? false

                  return (
                    <div
                      key={date}
                      className="grid px-4 py-3 items-center"
                      style={{
                        gridTemplateColumns: '1fr 72px 72px',
                        gap: 8,
                        borderTop: '0.5px solid var(--mini-border)',
                        background: (morning || evening) ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent',
                      }}
                    >
                      <div>
                        <span className="text-primary text-sm font-medium">{mm}/{dd}</span>
                        <span className="text-secondary text-xs ml-1.5">週{wd}</span>
                        {i === 0 && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>入住</span>}
                        {isLast && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>退房</span>}
                      </div>

                      {/* Morning toggle — 入住日不顯示（當天從別處入住，不從飯店出發） */}
                      <div className="flex justify-center">
                        {i !== 0 && (
                          <button
                            onClick={() => toggleAnchor(date, 'morning')}
                            style={{
                              width: 32, height: 32, borderRadius: 8, border: '0.5px solid',
                              background: morning ? 'var(--accent)' : 'var(--mini-bg)',
                              borderColor: morning ? 'var(--accent)' : 'var(--mini-border)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s, border-color 0.15s',
                            }}
                          >
                            {morning
                              ? <Check size={14} style={{ color: 'white' }} />
                              : <Sunrise size={14} style={{ color: 'var(--text-secondary)' }} />
                            }
                          </button>
                        )}
                      </div>

                      {/* Evening toggle — 退房日不顯示 */}
                      <div className="flex justify-center">
                        {!isLast && (
                          <button
                            onClick={() => toggleAnchor(date, 'evening')}
                            style={{
                              width: 32, height: 32, borderRadius: 8, border: '0.5px solid',
                              background: evening ? 'var(--accent)' : 'var(--mini-bg)',
                              borderColor: evening ? 'var(--accent)' : 'var(--mini-border)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.15s, border-color 0.15s',
                            }}
                          >
                            {evening
                              ? <Check size={14} style={{ color: 'white' }} />
                              : <Sunset size={14} style={{ color: 'var(--text-secondary)' }} />
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="px-4 py-3" style={{ borderTop: '0.5px solid var(--mini-border)' }}>
                  <p className="text-secondary text-xs">
                    勾選後自動新增佔位活動到行程，取消勾選則移除。「早」= 從飯店出發；「晚」= 返回飯店
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

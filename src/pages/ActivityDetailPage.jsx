import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, UtensilsCrossed, Ticket, Waves, Star, MapPin, Copy, Map, Navigation, Car, Bus, Footprints, Truck, Check } from 'lucide-react'
import { useState } from 'react'
import { useActivities } from '../hooks/useActivities'
import { ActivityDetailSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'

const TYPE_ICONS = {
  restaurant: UtensilsCrossed,
  attraction: Ticket,
  beach:      Waves,
  experience: Star,
  other:      MapPin,
}

const TRANSPORT_ICONS = {
  car:     Car,
  bus:     Bus,
  taxi:    Car,
  walk:    Footprints,
  shuttle: Truck,
}

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

export default function ActivityDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { activities, loading } = useActivities()
  const [copied, setCopied] = useState(false)
  const lang = i18n.language

  const activity = activities.find(a => a.id === id)

  if (loading) return <ActivityDetailSkeleton />

  if (!activity) return (
    <div className="px-4 py-8 text-center">
      <p className="text-secondary">{t('activities.noData')}</p>
    </div>
  )

  const Icon = TYPE_ICONS[activity.type] || MapPin
  const TransIcon = activity.transportAfter?.mode && TRANSPORT_ICONS[activity.transportAfter.mode]
  const address = bi(activity.address, lang)

  const copyAddress = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      toast.success(t('common.copied'))
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" style={{ minHeight: 44, minWidth: 44 }}>
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={() => navigate(`/trip/activities/${id}/edit`)}
          className="btn-ghost flex items-center gap-1.5 px-3"
          style={{ minHeight: 44 }}
        >
          <Pencil size={15} />
          <span className="text-sm">{t('common.edit')}</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Main card */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 rounded-xl glass-mini">
              <Icon size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-primary font-semibold text-lg leading-snug">
                {bi(activity.title, lang)}
              </h2>
              {bi(activity.location, lang) && (
                <p className="text-secondary text-sm mt-0.5">{bi(activity.location, lang)}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {activity.date && (
              <Row label={t('activities.fields.date')} value={activity.date} />
            )}
            {activity.startTime && (
              <Row
                label={t('activities.fields.startTime')}
                value={activity.endTime ? `${activity.startTime} – ${activity.endTime}` : activity.startTime}
              />
            )}
            {activity.segmentId && (
              <Row label="地點" value={activity.segmentId === 'hawaii' ? '夏威夷' : '首爾'} />
            )}
          </div>
        </div>

        {/* Address */}
        {address && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-secondary text-xs font-medium uppercase tracking-wide">{t('activities.fields.addressZh')?.replace('（中文）','') || '地址'}</p>
            <div className="flex items-start gap-2">
              <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <p className="text-primary text-sm leading-snug">{address}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost text-xs px-2.5 py-1" onClick={copyAddress}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {t('common.copy')}
              </button>
              <button
                className="btn-ghost text-xs px-2.5 py-1"
                onClick={() => {
                  const q = activity.lat && activity.lng
                    ? `${activity.lat},${activity.lng}`
                    : encodeURIComponent(address)
                  window.open(`https://maps.google.com/?q=${q}`)
                }}
              >
                <Map size={12} />
                {t('common.openMap')}
              </button>
              {activity.segmentId === 'seoul' && activity.lat && activity.lng && (
                <button
                  className="btn-ghost text-xs px-2.5 py-1"
                  onClick={() => window.open(`nmap://place?lat=${activity.lat}&lng=${activity.lng}&name=${encodeURIComponent(bi(activity.title, lang))}&appname=holo`)}
                >
                  <Navigation size={12} />
                  {t('common.naverMap')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Note */}
        {bi(activity.note, lang) && (
          <div className="glass-card p-4">
            <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-2">備註</p>
            <p className="text-primary text-sm leading-relaxed">{bi(activity.note, lang)}</p>
          </div>
        )}

        {/* Transport */}
        {activity.transportAfter?.mode && activity.transportAfter.mode !== 'none' && (
          <div className="glass-card p-4">
            <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-3">{t('activities.transport.title')}</p>
            <div className="flex items-center gap-2">
              {TransIcon && <TransIcon size={16} style={{ color: 'var(--accent)' }} />}
              <span className="text-primary text-sm font-medium">
                {t(`activities.transport.mode.${activity.transportAfter.mode}`)}
              </span>
              {activity.transportAfter.durationMin > 0 && (
                <span className="text-secondary text-sm">· {activity.transportAfter.durationMin} {t('activities.transport.duration')}</span>
              )}
            </div>
            {bi(activity.transportAfter.note, lang) && (
              <p className="text-secondary text-sm mt-2">{bi(activity.transportAfter.note, lang)}</p>
            )}
          </div>
        )}

        {/* Images */}
        {activity.images?.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-secondary text-xs font-medium uppercase tracking-wide mb-3">{t('activities.fields.images')}</p>
            <div className="grid grid-cols-2 gap-2">
              {activity.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--mini-border)' }}>
      <span className="text-secondary text-sm">{label}</span>
      <span className="text-primary text-sm font-medium">{value}</span>
    </div>
  )
}

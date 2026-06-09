import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus, UtensilsCrossed, Ticket, Waves, Star, MapPin, Copy, Map, Navigation, Car, Bus, Footprints, Truck, Check } from 'lucide-react'
import { useActivities } from '../hooks/useActivities'
import ConfirmDialog from '../components/ConfirmDialog'
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

export default function ActivitiesPage() {
  const { t, i18n } = useTranslation()
  const { activities, loading, deleteActivity } = useActivities()
  const [delId, setDelId] = useState(null)
  const [copied, setCopied] = useState(null)
  const lang = i18n.language

  const byDate = activities.reduce((acc, a) => {
    acc[a.date] = acc[a.date] || []
    acc[a.date].push(a)
    return acc
  }, {})

  const copyAddress = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      toast.success(t('common.copied'))
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const isSeoul = (activity) => activity.segmentId === 'seoul'

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('activities.title')}</h2>
        <Link to="/trip/activities/new" className="btn-primary">
          <Plus size={18} />
          {t('activities.new')}
        </Link>
      </div>

      {loading && <p className="text-secondary text-center py-8">{t('common.loading')}</p>}
      {!loading && activities.length === 0 && (
        <p className="text-secondary text-center py-8">{t('activities.noData')}</p>
      )}

      {Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, items]) => (
        <div key={date} className="mb-6">
          <p className="text-secondary text-sm mb-2 font-medium">{date}</p>
          <div className="space-y-3">
            {items.map(activity => {
              const Icon = TYPE_ICONS[activity.type] || MapPin
              const address = bi(activity.address, lang)
              const TransIcon = activity.transportAfter?.mode && TRANSPORT_ICONS[activity.transportAfter.mode]

              return (
                <div key={activity.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg glass-mini">
                      <Icon size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/trip/activities/${activity.id}`}>
                        <p className="text-primary font-medium text-base leading-snug">
                          {bi(activity.title, lang)}
                        </p>
                      </Link>
                      <p className="text-secondary text-sm mt-0.5">{bi(activity.location, lang)}</p>
                      {activity.startTime && (
                        <p className="text-secondary text-xs mt-1">
                          {activity.startTime}{activity.endTime ? ` – ${activity.endTime}` : ''}
                        </p>
                      )}
                      {bi(activity.note, lang) && (
                        <p className="text-secondary text-sm mt-2">{bi(activity.note, lang)}</p>
                      )}

                      {/* Address actions */}
                      {address && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            className="btn-ghost text-xs px-3 py-1.5"
                            style={{ minHeight: 36 }}
                            onClick={() => copyAddress(address, activity.id)}
                          >
                            {copied === activity.id ? <Check size={14} /> : <Copy size={14} />}
                            {t('common.copy')}
                          </button>
                          {activity.lat && activity.lng && (
                            <button
                              className="btn-ghost text-xs px-3 py-1.5"
                              style={{ minHeight: 36 }}
                              onClick={() => window.open(`https://maps.google.com/?q=${activity.lat},${activity.lng}`)}
                            >
                              <Map size={14} />
                              {t('common.openMap')}
                            </button>
                          )}
                          {isSeoul(activity) && activity.lat && activity.lng && (
                            <button
                              className="btn-ghost text-xs px-3 py-1.5"
                              style={{ minHeight: 36 }}
                              onClick={() => window.open(`nmap://place?lat=${activity.lat}&lng=${activity.lng}&name=${encodeURIComponent(bi(activity.title, lang))}&appname=holo`)}
                            >
                              <Navigation size={14} />
                              {t('common.naverMap')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      className="text-secondary p-2"
                      style={{ minWidth: 44, minHeight: 44 }}
                      onClick={() => setDelId(activity.id)}
                    >
                      <span className="text-xs">{t('common.delete')}</span>
                    </button>
                  </div>

                  {/* Transport after */}
                  {activity.transportAfter?.mode && activity.transportAfter.mode !== 'none' && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--glass-border)' }}>
                      {TransIcon && <TransIcon size={14} style={{ color: 'var(--text-secondary)' }} />}
                      <span className="text-secondary text-xs">
                        {t(`activities.transport.mode.${activity.transportAfter.mode}`)}
                        {activity.transportAfter.durationMin ? ` · ${activity.transportAfter.durationMin} ${t('activities.transport.duration')}` : ''}
                      </span>
                      {bi(activity.transportAfter.note, lang) && (
                        <span className="text-secondary text-xs">· {bi(activity.transportAfter.note, lang)}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteActivity(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}

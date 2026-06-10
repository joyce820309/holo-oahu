import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Hotel, MapPin, Phone } from 'lucide-react'
import { useHotels } from '../hooks/useHotels'
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

export default function HotelDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { hotels, loading } = useHotels()
  const [copiedField, setCopiedField] = useState(null)
  const lang = i18n.language

  const hotel = hotels.find(h => h.id === id)

  const copyValue = (field, value) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field)
      toast.success(t('common.copied'))
      setTimeout(() => setCopiedField(null), 1800)
    })
  }

  if (loading) {
    return (
      <div className="px-4 pb-24">
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
    <div className="px-4 pb-24">
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
      </div>
    </div>
  )
}

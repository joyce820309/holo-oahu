import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useActivities } from '../hooks/useActivities'
import { useHotels } from '../hooks/useHotels'
import { Copy, Check, ExternalLink, Hotel, MapPin, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// ── Leaflet icon fix ───────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 8 12 24 12 24s12-16 12-24C24 5.373 18.627 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
    </svg>`,
    iconSize:   [24, 36],
    iconAnchor: [12, 36],
    popupAnchor:[0, -38],
  })
}

const ACTIVITY_ICON = makeIcon('#3B9EFF')  // accent blue
const HOTEL_ICON    = makeIcon('#e05555')  // red

// ── Helpers ────────────────────────────────────────────────────────────────
function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

const geocodeCache = {}

async function geocode(address) {
  if (!address) return null
  if (geocodeCache[address]) return geocodeCache[address]
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'HoloTripApp/1.0' },
    })
    const data = await res.json()
    if (data.length) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[address] = result
      return result
    }
  } catch {}
  return null
}

// Rate-limited geocode queue (Nominatim: 1 req/sec)
async function geocodeBatch(items, getLang) {
  const results = {}
  for (const item of items) {
    const addr = bi(item.address, getLang())
    if (!addr) continue
    const coords = await geocode(addr)
    if (coords) results[item.id] = coords
    await new Promise(r => setTimeout(r, 1100))
  }
  return results
}

// ── Map click closes popup ─────────────────────────────────────────────────
function MapClickClose({ onClose }) {
  useMapEvents({ click: onClose })
  return null
}

// ── Custom popup card ──────────────────────────────────────────────────────
function PopupCard({ item, type, lang, onClose, t, navigate }) {
  const [copied, setCopied] = useState(false)
  const address = bi(item.address, lang)
  const title   = type === 'activity' ? bi(item.title, lang) : bi(item.name, lang)
  const subtitle = type === 'activity'
    ? (item.startTime ? `${item.date ?? ''} ${item.startTime}` : item.date ?? '')
    : `${item.checkIn ?? ''} – ${item.checkOut ?? ''}`

  const copyAddr = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true); toast.success(t('common.copied'))
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, width: 'calc(100% - 32px)', maxWidth: 340,
      background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '14px 16px',
    }}>
      {/* close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, color: 'var(--text-secondary)', padding: 4 }}>
        <X size={16} />
      </button>

      {/* icon + title */}
      <div className="flex items-start gap-2.5 pr-6">
        <div className="p-1.5 rounded-lg glass-mini flex-shrink-0" style={{ marginTop: 1 }}>
          {type === 'activity'
            ? <MapPin size={15} style={{ color: '#3B9EFF' }} />
            : <Hotel  size={15} style={{ color: '#e05555' }} />
          }
        </div>
        <div className="min-w-0">
          <p className="text-primary font-medium text-sm leading-snug">{title}</p>
          {subtitle.trim() && <p className="text-secondary text-xs mt-0.5">{subtitle.trim()}</p>}
        </div>
      </div>

      {/* address */}
      {address && (
        <p className="text-secondary text-xs mt-2.5 leading-snug line-clamp-2">{address}</p>
      )}

      {/* actions */}
      <div className="flex gap-2 mt-3">
        {address && (
          <button
            className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            style={{ minHeight: 32 }}
            onClick={copyAddr}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {t('common.copy')}
          </button>
        )}
        <button
          className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
          style={{ minHeight: 32 }}
          onClick={() => {
            const lat = item._geocodedLat ?? item.lat
            const lng = item._geocodedLng ?? item.lng
            const q = lat && lng ? `${lat},${lng}` : encodeURIComponent(address)
            window.open(`https://maps.google.com/?q=${q}`)
          }}
        >
          <ExternalLink size={13} />Google Maps
        </button>
        {type === 'activity' && (
          <button
            className="btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1.5 ml-auto"
            style={{ minHeight: 32 }}
            onClick={() => navigate(`/trip/activities/${item.id}`)}
          >
            詳情
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function MapPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { activities } = useActivities()
  const { hotels }     = useHotels()
  const lang = i18n.language
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  // geocoded coords: { [id]: { lat, lng } }
  const [geocoded, setGeocoded] = useState({})
  const [selected, setSelected] = useState(null)  // { item, type }
  const geocodingRef = useRef(false)

  // Geocode items that have address but no lat/lng
  useEffect(() => {
    if (geocodingRef.current) return
    const needsGeocode = [
      ...activities.filter(a => !a.lat && !a.lng && bi(a.address, lang)),
      ...hotels.filter(h => !h.lat && !h.lng && bi(h.address, lang)),
    ]
    if (!needsGeocode.length) return
    geocodingRef.current = true
    geocodeBatch(needsGeocode, () => langRef.current).then(results => {
      setGeocoded(prev => ({ ...prev, ...results }))
      geocodingRef.current = false
    })
  }, [activities, hotels]) // eslint-disable-line

  // Merge stored coords with geocoded coords
  const activityMarkers = activities.map(a => {
    const gc = geocoded[a.id]
    return { ...a, lat: a.lat ?? gc?.lat, lng: a.lng ?? gc?.lng, _geocoded: !!gc }
  }).filter(a => a.lat && a.lng)

  const hotelMarkers = hotels.map(h => {
    const gc = geocoded[h.id]
    return { ...h, lat: h.lat ?? gc?.lat, lng: h.lng ?? gc?.lng, _geocoded: !!gc }
  }).filter(h => h.lat && h.lng)

  const closePopup = useCallback(() => setSelected(null), [])

  return (
    <div style={{ position: 'relative', height: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column' }} className="pb-20">
      <h2 className="text-primary font-medium text-xl px-4 py-4 flex-shrink-0">{t('map.title')}</h2>

      <div className="flex-1 mx-2 rounded-2xl overflow-hidden" style={{ position: 'relative' }}>
        <MapContainer
          center={[21.3069, -157.8583]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapClickClose onClose={closePopup} />

          {activityMarkers.map(a => (
            <Marker key={a.id} position={[a.lat, a.lng]} icon={ACTIVITY_ICON}
              eventHandlers={{ click: () => setSelected({ item: a, type: 'activity' }) }}
            />
          ))}
          {hotelMarkers.map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={HOTEL_ICON}
              eventHandlers={{ click: () => setSelected({ item: h, type: 'hotel' }) }}
            />
          ))}
        </MapContainer>

        {/* Legend */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 500,
          background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 10, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B9EFF', flexShrink: 0 }} />
            <span className="text-primary text-xs">{t('activities.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#e05555', flexShrink: 0 }} />
            <span className="text-primary text-xs">{t('hotels.title')}</span>
          </div>
        </div>

        {/* Custom popup */}
        {selected && (
          <PopupCard
            item={selected.item}
            type={selected.type}
            lang={lang}
            onClose={closePopup}
            t={t}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  )
}

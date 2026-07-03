import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useActivities } from '../hooks/useActivities'
import { useHotels } from '../hooks/useHotels'
import { Copy, Check, ExternalLink, Hotel, MapPin, X, Bed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { TRIP_START_DATE, TRIP_END_DATE } from '../lib/tripCalendar'

// ── Leaflet icon fix ───────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function makeIcon(color, label) {
  const badgeHtml = label !== undefined
    ? `<div style="position:absolute;top:1px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:900;color:${color};line-height:1;background:white;border-radius:50%;border:2px solid ${color};padding:5px 7px;white-space:nowrap;">${label}</div>`
    : ''
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:40px">
      ${badgeHtml}
      <svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize:    [28, 52],
    iconAnchor:  [14, 52],
    popupAnchor: [0, -54],
  })
}

const HOTEL_ICON = makeIcon('#cd8686')

// ── Helpers ────────────────────────────────────────────────────────────────
function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

// 產生行程日期清單
function getTripDates() {
  const dates = []
  let cur = new Date(TRIP_START_DATE + 'T00:00:00')
  const end = new Date(TRIP_END_DATE + 'T00:00:00')
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
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
    if (data?.length) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[address] = result
      return result
    }
  } catch {}
  return null
}

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

// ── Auto-fit bounds when markers change ───────────────────────────────────
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], map.getZoom())
      return
    }
    map.fitBounds(points, { padding: [40, 40] })
  }, [points, map]) // eslint-disable-line
  return null
}

function MapClickClose({ onClose }) {
  useMapEvents({ click: onClose })
  return null
}

// ── Popup card ─────────────────────────────────────────────────────────────
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
      position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, width: 'calc(100% - 32px)', maxWidth: 340,
      background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '14px 16px',
    }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, color: 'var(--text-secondary)', padding: 4 }}>
        <X size={16} />
      </button>

      <div className="flex items-start gap-2.5 pr-6">
        <div className="p-1.5 rounded-lg glass-mini flex-shrink-0" style={{ marginTop: 1 }}>
          {type === 'activity'
            ? <MapPin size={15} style={{ color: '#3B9EFF' }} />
            : <Bed    size={15} style={{ color: 'var(--danger)' }} />
          }
        </div>
        <div className="min-w-0">
          <p className="text-primary font-medium text-sm leading-snug">{title}</p>
          {subtitle.trim() && <p className="text-secondary text-xs mt-0.5">{subtitle.trim()}</p>}
        </div>
      </div>

      {address && (
        <p className="text-secondary text-xs mt-2.5 leading-snug line-clamp-2">{address}</p>
      )}

      <div className="flex gap-2 mt-3 flex-wrap">
        {address && (
          <button className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5" style={{ minHeight: 32 }} onClick={copyAddr}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {t('common.copy')}
          </button>
        )}
        <button
          className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5"
          style={{ minHeight: 32 }}
          onClick={() => {
            const lat = item.lat; const lng = item.lng
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
          >詳情</button>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
const TRIP_DATES = getTripDates()

export default function MapPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { activities } = useActivities()
  const { hotels }     = useHotels()
  const lang = i18n.language
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  const [selectedDate, setSelectedDate] = useState(TRIP_DATES[0])
  const [geocoded, setGeocoded]         = useState({})
  const [selected, setSelected]         = useState(null)
  const geocodingRef = useRef(false)

  // Geocode all items without coords (all dates, cached)
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

  // Resolve coords helper
  const resolveCoords = useCallback((item) => {
    const gc = geocoded[item.id]
    const lat = item.lat ?? gc?.lat
    const lng = item.lng ?? gc?.lng
    return (lat && lng) ? { ...item, lat, lng } : null
  }, [geocoded])

  // 當天行程 markers（有座標、非系統活動、按時間排序）
  const dayActivityMarkers = useMemo(() => {
    return activities
      .filter(a => a.date === selectedDate && !a.flightId && !a._hotelAnchor)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map(resolveCoords)
      .filter(Boolean)
  }, [activities, selectedDate, resolveCoords])

  // 住宿 markers：checkIn <= selectedDate < checkOut（住宿期間都顯示）
  const dayHotelMarkers = useMemo(() => {
    return hotels
      .filter(h => h.checkIn && h.checkOut && h.checkIn <= selectedDate && selectedDate < h.checkOut)
      .map(resolveCoords)
      .filter(Boolean)
  }, [hotels, selectedDate, resolveCoords])

  // 連線用的座標（行程順序）
  const polylinePoints = useMemo(() =>
    dayActivityMarkers.map(a => [a.lat, a.lng]),
    [dayActivityMarkers]
  )

  // fit bounds 用的所有點
  const allPoints = useMemo(() => [
    ...dayActivityMarkers.map(a => [a.lat, a.lng]),
    ...dayHotelMarkers.map(h => [h.lat, h.lng]),
  ], [dayActivityMarkers, dayHotelMarkers])

  const closePopup = useCallback(() => setSelected(null), [])

  // 日期格式化：7/18 (六)
  function fmtTab(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const weekday = ['日','一','二','三','四','五','六'][d.getDay()]
    return `${d.getMonth()+1}/${d.getDate()} (${weekday})`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 className="text-primary font-medium text-xl px-4 pt-4 pb-2 flex-shrink-0">{t('map.title')}</h2>

      {/* Date tabs */}
      <div className="flex gap-1 px-4 pb-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {TRIP_DATES.map(date => (
          <button
            key={date}
            onClick={() => { setSelectedDate(date); setSelected(null) }}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={selectedDate === date
              ? { background: 'var(--accent)', color: 'white' }
              : { background: 'var(--mini-bg)', color: 'var(--text-secondary)', border: '0.5px solid var(--mini-border)' }
            }
          >{fmtTab(date)}</button>
        ))}
      </div>

      {/* Map */}
      <div className="mx-2 rounded-2xl overflow-hidden" style={{ position: 'relative', height: 'calc(100dvh - 260px)' }}>
        <MapContainer
          center={[21.3069, -157.8583]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <FitBounds points={allPoints} />
          <MapClickClose onClose={closePopup} />

          {/* 行程連線 */}
          {polylinePoints.length > 1 && (
            <Polyline
              positions={polylinePoints}
              pathOptions={{ color: '#3B9EFF', weight: 2.5, opacity: 0.7, dashArray: '6 5' }}
            />
          )}

          {/* 行程 markers（編號） */}
          {dayActivityMarkers.map((a, idx) => (
            <Marker
              key={a.id}
              position={[a.lat, a.lng]}
              icon={makeIcon('#3B9EFF', idx + 1)}
              eventHandlers={{ click: () => { setSelected({ item: a, type: 'activity' }) } }}
            />
          ))}

          {/* 住宿 markers */}
          {dayHotelMarkers.map(h => (
            <Marker
              key={h.id}
              position={[h.lat, h.lng]}
              icon={HOTEL_ICON}
              eventHandlers={{ click: () => { setSelected({ item: h, type: 'hotel' }) } }}
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
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
            <span className="text-primary text-xs">{t('hotels.title')}</span>
          </div>
        </div>

        {/* Marker count badge */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 500,
          background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 8, padding: '4px 10px', fontSize: 11, color: 'var(--text-secondary)',
        }}>
          {dayActivityMarkers.length} 個行程・{dayHotelMarkers.length} 間住宿
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

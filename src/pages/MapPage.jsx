import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useActivities } from '../hooks/useActivities'
import { useHotels } from '../hooks/useHotels'
import { Copy } from 'lucide-react'
import toast from 'react-hot-toast'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const hotelIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

export default function MapPage() {
  const { t, i18n } = useTranslation()
  const { activities } = useActivities()
  const { hotels }     = useHotels()
  const lang = i18n.language

  const activityMarkers = activities.filter(a => a.lat && a.lng)
  const hotelMarkers    = hotels.filter(h => h.lat && h.lng)

  return (
    <div className="flex flex-col pb-20" style={{ height: '100vh' }}>
      <h2 className="text-primary font-medium text-xl px-4 py-4">{t('map.title')}</h2>
      <div className="flex-1 mx-2 rounded-2xl overflow-hidden">
        <MapContainer
          center={[21.3069, -157.8583]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {activityMarkers.map(a => (
            <Marker key={a.id} position={[a.lat, a.lng]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">{bi(a.title, lang)}</p>
                  <p className="text-gray-500">{a.startTime}</p>
                  {bi(a.address, lang) && (
                    <button
                      className="mt-1 text-xs text-blue-500 flex items-center gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(bi(a.address, lang))
                        toast.success(t('common.copied'))
                      }}
                    >
                      <Copy size={12} />{t('common.copy')}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {hotelMarkers.map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={hotelIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">{bi(h.name, lang)}</p>
                  <p className="text-gray-500">{h.checkIn} – {h.checkOut}</p>
                  {bi(h.address, lang) && (
                    <button
                      className="mt-1 text-xs text-blue-500 flex items-center gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(bi(h.address, lang))
                        toast.success(t('common.copied'))
                      }}
                    >
                      <Copy size={12} />{t('common.copy')}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

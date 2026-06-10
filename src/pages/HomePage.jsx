import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cloud, Wind, Thermometer } from 'lucide-react'
import { useTrip } from '../hooks/useTrip'
import { Skeleton, WeatherSkeleton } from '../components/Skeleton'

const CLOCKS = [
  { key: 'home.taiwan', tz: 'Asia/Taipei'       },
  { key: 'home.hawaii', tz: 'Pacific/Honolulu'  },
  { key: 'home.seoul',  tz: 'Asia/Seoul'        },
]

const WEATHER_URLS = {
  hawaii: 'https://api.open-meteo.com/v1/forecast?latitude=21.3069&longitude=-157.8583&current=temperature_2m,weathercode,windspeed_10m&timezone=Pacific%2FHonolulu',
  seoul:  'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,weathercode&timezone=Asia%2FSeoul',
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmtTime(date, tz) {
  return new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
}

function fmtDate(date, tz, lang) {
  return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : 'en', {
    timeZone: tz, month: 'short', day: 'numeric', weekday: 'short',
  }).format(date)
}

function useWeather() {
  const [weather, setWeather] = useState({})
  useEffect(() => {
    Object.entries(WEATHER_URLS).forEach(([key, url]) => {
      fetch(url).then(r => r.json()).then(data => {
        setWeather(w => ({ ...w, [key]: data.current }))
      }).catch(() => {})
    })
  }, [])
  return weather
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const now     = useClock()
  const weather = useWeather()
  const { trip } = useTrip()
  const lang = i18n.language

  const getWeatherDesc = (code) => {
    const key = `weather.code.${code}`
    return t(key, { defaultValue: String(code) })
  }

  const tripStart = new Date('2026-07-18')
  const today     = new Date()
  today.setHours(0,0,0,0)
  tripStart.setHours(0,0,0,0)
  const daysLeft = Math.ceil((tripStart - today) / 86400000)

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Trip countdown */}
      <div className="glass-card p-4 text-center">
        <p className="text-secondary text-sm">{t('home.tripDates')}</p>
        {daysLeft > 0
          ? <p className="text-primary text-2xl font-medium mt-1">{daysLeft} {t('home.daysLeft')}</p>
          : daysLeft === 0
            ? <p className="text-primary text-2xl font-medium mt-1">出發日！ / Departure day!</p>
            : <p className="text-accent text-lg font-medium mt-1">{t('home.tripStarted')}</p>
        }
      </div>

      {/* Three clocks */}
      <div className="grid grid-cols-3 gap-2">
        {CLOCKS.map(({ key, tz }) => (
          <div key={tz} className="glass-mini p-3 text-center">
            <p className="text-secondary text-xs mb-1">{t(key)}</p>
            <p className="text-primary font-medium text-sm tabular-nums">{fmtTime(now, tz)}</p>
            <p className="text-secondary text-xs mt-0.5">{fmtDate(now, tz, lang)}</p>
          </div>
        ))}
      </div>

      {/* Weather */}
      <div className="space-y-2">
        {[
          { key: 'hawaii', label: t('home.hawaii') },
          { key: 'seoul',  label: t('home.seoul')  },
        ].map(({ key, label }) => {
          const w = weather[key]
          return (
            <div key={key} className="glass-mini p-4 flex items-center justify-between">
              <div>
                <p className="text-primary font-medium">{label}</p>
                {w
                  ? <p className="text-secondary text-sm">{getWeatherDesc(w.weathercode)}</p>
                  : <Skeleton className="h-3 w-24 mt-1" />
                }
              </div>
              {w && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-primary">
                    <Thermometer size={16} />
                    <span className="font-medium">{Math.round(w.temperature_2m)}°C</span>
                  </div>
                  {w.windspeed_10m !== undefined && (
                    <div className="flex items-center gap-1 text-secondary text-sm">
                      <Wind size={14} />
                      <span>{Math.round(w.windspeed_10m)} km/h</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Trip segments */}
      {trip?.segments && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-primary font-medium">{trip.name}</p>
          {trip.segments.map(seg => (
            <div key={seg.id} className="glass-mini p-3">
              <p className="text-primary text-sm font-medium">
                {lang === 'zh-TW' ? seg.name.zh : seg.name.en}
              </p>
              <p className="text-secondary text-xs">{seg.dateFrom} – {seg.dateTo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

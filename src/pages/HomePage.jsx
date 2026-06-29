import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wind, Thermometer, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { Skeleton } from '../components/Skeleton'
import { WEATHER_POINTS, buildCurrentWeatherUrl } from '../lib/weather'
import { getDeviceDateString, getRecentTripDateByDeviceDate, getTripPhaseByDeviceDate, TRIP_START_DATE } from '../lib/tripCalendar'

const CLOCKS = [
  { key: 'home.taiwan', tz: 'Asia/Taipei'       },
  { key: 'home.hawaii', tz: 'Pacific/Honolulu'  },
  { key: 'home.seoul',  tz: 'Asia/Seoul'        },
]

const WEATHER_CARDS = [
  WEATHER_POINTS.hotelWaikiki,
  WEATHER_POINTS.hawaii,
  WEATHER_POINTS.seoul,
]

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
    WEATHER_CARDS.forEach((point) => {
      const url = buildCurrentWeatherUrl(point)
      fetch(url).then(r => r.json()).then(data => {
        setWeather(w => ({ ...w, [point.key]: data.current }))
      }).catch(() => {})
    })
  }, [])
  return weather
}

export default function HomePage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const now     = useClock()
  const weather = useWeather()
  const { trip } = useTrip()
  const lang = i18n.language

  const getWeatherDesc = (code) => {
    const key = `weather.code.${code}`
    return t(key, { defaultValue: String(code) })
  }

  const tripStart = new Date(TRIP_START_DATE)
  const today     = new Date()
  today.setHours(0,0,0,0)
  tripStart.setHours(0,0,0,0)
  const daysLeft = Math.ceil((tripStart - today) / 86400000)

  const deviceDate = getDeviceDateString(today)
  const recentTripDate = getRecentTripDateByDeviceDate(deviceDate)
  const tripPhase = getTripPhaseByDeviceDate(deviceDate)
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const deviceTime = new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date())

  const recentDayTitle = tripPhase === 'before'
    ? t('home.recentDay.before')
    : tripPhase === 'during'
      ? t('home.recentDay.during')
      : t('home.recentDay.after')

  return (
    <div className="px-4 pt-4 pb-36 space-y-4">
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
        {WEATHER_CARDS.map((point) => {
          const key = point.key
          const label = t(point.labelKey)
          const w = weather[key]
          const isHotelCard = key === 'hotelWaikiki'
          const cardClassName = 'glass-mini p-4 w-full flex items-center justify-between text-left'

          const cardContent = (
            <>
              <div>
                <p className="text-primary font-medium">{label}</p>
                {w
                  ? <p className="text-secondary text-sm">{getWeatherDesc(w.weathercode)}</p>
                  : <Skeleton className="h-3 w-24 mt-1" />
                }
              </div>
              {w && (
                <div className="flex items-center gap-3">
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
                  {isHotelCard && <ChevronRight size={16} className="text-secondary" />}
                </div>
              )}
            </>
          )

          return (
            isHotelCard ? (
              <button
                key={key}
                type="button"
                className={cardClassName}
                onClick={() => navigate('/trip/weather/hotel')}
                aria-label={t('weather.detailsCta')}
              >
                {cardContent}
              </button>
            ) : (
              <div key={key} className={cardClassName}>
                {cardContent}
              </div>
            )
          )
        })}
      </div>

      <button
        type="button"
        className="glass-card p-4 w-full text-left"
        style={{ border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--glass-border))' }}
        onClick={() => navigate(`/trip/activities?date=${recentTripDate}&view=recent`)}
        aria-label={t('home.viewRecentDay')}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-accent text-xs font-medium">{t('home.viewRecentDay')}</p>
            <p className="text-primary text-lg font-semibold mt-1">{recentDayTitle}</p>
            <p className="text-secondary text-sm mt-1">{t('home.recentDay.date', { date: recentTripDate })}</p>
            <p className="text-secondary text-xs mt-2">
              {t('home.deviceTime', { time: deviceTime, timezone: deviceTimezone })}
            </p>
          </div>
          <div className="text-accent pt-1">
            <ChevronRight size={20} />
          </div>
        </div>
      </button>

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

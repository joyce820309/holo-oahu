import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CloudRain, Droplets, Wind, Thermometer, Sun, Eye, Cloud } from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import { WEATHER_POINTS, buildHotelDetailWeatherUrl } from '../lib/weather'

const HOUR_MS = 3600000

function fmtHour(time, lang) {
  const date = new Date(time)
  return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function fmtDateTime(time, lang) {
  const date = new Date(time)
  return new Intl.DateTimeFormat(lang === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export default function WeatherDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    fetch(buildHotelDetailWeatherUrl())
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return
        if (!json?.hourly?.time || !json?.current) {
          setError(true)
          return
        }
        setData(json)
      })
      .catch(() => {
        if (alive) setError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const next24Hours = useMemo(() => {
    if (!data?.hourly?.time) return []
    const hourly = data.hourly
    const fromTime = data.current?.time ? new Date(data.current.time).getTime() : Date.now()
    const until = fromTime + (24 * HOUR_MS)
    return hourly.time
      .map((time, i) => ({
        time,
        precipitationProbability: hourly.precipitation_probability?.[i],
        precipitation: hourly.precipitation?.[i],
        windSpeed: hourly.windspeed_10m?.[i],
        apparentTemperature: hourly.apparent_temperature?.[i],
        uv: hourly.uv_index?.[i],
        humidity: hourly.relative_humidity_2m?.[i],
        cloudCover: hourly.cloudcover?.[i],
        visibility: hourly.visibility?.[i],
      }))
      .filter((row) => {
        const ts = new Date(row.time).getTime()
        return ts >= fromTime && ts <= until
      })
  }, [data])

  const current = data?.current
  const today = data?.daily

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center gap-2 py-4">
        <button
          type="button"
          className="btn-ghost h-10 w-10 rounded-xl flex items-center justify-center"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-primary font-medium text-xl">{t('weatherDetail.title')}</h2>
          <p className="text-secondary text-xs">{WEATHER_POINTS.hotelWaikiki.address}</p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="glass-card p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="glass-card p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="glass-card p-4">
          <p className="text-primary font-medium">{t('weatherDetail.loadError')}</p>
          <p className="text-secondary text-sm mt-1">{t('weatherDetail.tryLater')}</p>
        </div>
      )}

      {!loading && !error && current && (
        <div className="space-y-3">
          <section className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-secondary text-xs">{t('weatherDetail.now')}</p>
                <p className="text-primary text-3xl font-semibold mt-1">{Math.round(current.temperature_2m)}°C</p>
                <p className="text-secondary text-sm mt-1">{fmtDateTime(current.time, lang)}</p>
              </div>
              <div className="text-right">
                <p className="text-secondary text-xs">{t('weatherDetail.feelsLike')}</p>
                <p className="text-primary text-lg font-medium">{Math.round(current.apparent_temperature)}°C</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="glass-mini p-3">
                <div className="flex items-center gap-2 text-secondary text-xs">
                  <Wind size={13} />
                  <span>{t('weatherDetail.wind')}</span>
                </div>
                <p className="text-primary font-medium mt-1">{Math.round(current.windspeed_10m)} km/h</p>
              </div>
              <div className="glass-mini p-3">
                <div className="flex items-center gap-2 text-secondary text-xs">
                  <Droplets size={13} />
                  <span>{t('weatherDetail.humidity')}</span>
                </div>
                <p className="text-primary font-medium mt-1">{Math.round(current.relative_humidity_2m)}%</p>
              </div>
              <div className="glass-mini p-3">
                <div className="flex items-center gap-2 text-secondary text-xs">
                  <Sun size={13} />
                  <span>{t('weatherDetail.uvMax')}</span>
                </div>
                <p className="text-primary font-medium mt-1">{today?.uv_index_max?.[0] ?? '-'}</p>
              </div>
              <div className="glass-mini p-3">
                <div className="flex items-center gap-2 text-secondary text-xs">
                  <CloudRain size={13} />
                  <span>{t('weatherDetail.rainChanceMax')}</span>
                </div>
                <p className="text-primary font-medium mt-1">{today?.precipitation_probability_max?.[0] ?? '-'}%</p>
              </div>
            </div>
          </section>

          <section className="glass-card p-4">
            <h3 className="text-primary font-medium">{t('weatherDetail.hourly24h')}</h3>
            <p className="text-secondary text-xs mt-1">{t('weatherDetail.hourlyHint')}</p>

            <div className="space-y-2 mt-3">
              {next24Hours.map((row) => (
                <div key={row.time} className="glass-mini p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-primary text-sm font-medium">{fmtHour(row.time, lang)}</p>
                    <div className="flex items-center gap-3 text-secondary text-xs">
                      <span className="inline-flex items-center gap-1"><Thermometer size={12} />{Math.round(row.apparentTemperature)}°C</span>
                      <span className="inline-flex items-center gap-1"><Sun size={12} />UV {Math.round(row.uv ?? 0)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
                    <p className="text-secondary">{t('weatherDetail.rainChance')}: <span className="text-primary">{Math.round(row.precipitationProbability ?? 0)}%</span></p>
                    <p className="text-secondary">{t('weatherDetail.rainAmount')}: <span className="text-primary">{(row.precipitation ?? 0).toFixed(1)} mm</span></p>
                    <p className="text-secondary">{t('weatherDetail.wind')}: <span className="text-primary">{Math.round(row.windSpeed ?? 0)} km/h</span></p>
                    <p className="text-secondary">{t('weatherDetail.humidity')}: <span className="text-primary">{Math.round(row.humidity ?? 0)}%</span></p>
                    <p className="text-secondary inline-flex items-center gap-1"><Cloud size={12} />{t('weatherDetail.cloudCover')}: <span className="text-primary">{Math.round(row.cloudCover ?? 0)}%</span></p>
                    <p className="text-secondary inline-flex items-center gap-1"><Eye size={12} />{t('weatherDetail.visibility')}: <span className="text-primary">{Math.round((row.visibility ?? 0) / 1000)} km</span></p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
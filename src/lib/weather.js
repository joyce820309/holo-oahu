const DEFAULT_TIMEZONE = 'Pacific/Honolulu'

export const WEATHER_POINTS = {
  hotelWaikiki: {
    key: 'hotelWaikiki',
    labelKey: 'home.hotelWaikiki',
    latitude: 21.2749,
    longitude: -157.8245,
    timezone: DEFAULT_TIMEZONE,
    address: '2490 Kalakaua Ave, Honolulu, HI 96815, USA',
  },
  hawaii: {
    key: 'hawaii',
    labelKey: 'home.hawaii',
    latitude: 21.3069,
    longitude: -157.8583,
    timezone: DEFAULT_TIMEZONE,
  },
  seoul: {
    key: 'seoul',
    labelKey: 'home.seoul',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  },
}

export function buildCurrentWeatherUrl({ latitude, longitude, timezone }) {
  const qs = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,relative_humidity_2m',
    timezone,
  })
  return `https://api.open-meteo.com/v1/forecast?${qs.toString()}`
}

export function buildHotelDetailWeatherUrl() {
  const hotel = WEATHER_POINTS.hotelWaikiki
  const qs = new URLSearchParams({
    latitude: String(hotel.latitude),
    longitude: String(hotel.longitude),
    current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,relative_humidity_2m,is_day',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,windspeed_10m,uv_index,relative_humidity_2m,cloudcover,visibility',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    forecast_days: '3',
    timezone: hotel.timezone,
  })
  return `https://api.open-meteo.com/v1/forecast?${qs.toString()}`
}
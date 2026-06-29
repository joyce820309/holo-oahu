export const TRIP_START_DATE = '2026-07-18'
export const TRIP_END_DATE = '2026-07-26'

export function getDeviceDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTripPhaseByDeviceDate(deviceDate = getDeviceDateString()) {
  if (deviceDate < TRIP_START_DATE) return 'before'
  if (deviceDate > TRIP_END_DATE) return 'after'
  return 'during'
}

export function getRecentTripDateByDeviceDate(deviceDate = getDeviceDateString()) {
  const phase = getTripPhaseByDeviceDate(deviceDate)
  if (phase === 'before') return TRIP_START_DATE
  if (phase === 'after') return TRIP_END_DATE
  return deviceDate
}
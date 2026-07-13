function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field.trim()
  const primary = lang === 'zh-TW' ? 'zh' : 'en'
  const secondary = primary === 'zh' ? 'en' : 'zh'
  return String(field[primary] || field[secondary] || '').trim()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateOnly(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10)
  return ''
}

function toTimeOnly(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const match = text.match(/(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

function buildTripDates(tripStartDate, tripEndDate) {
  const dates = []
  const start = new Date(`${tripStartDate}T00:00:00`)
  const end = new Date(`${tripEndDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return dates

  const cur = new Date(start)
  while (cur <= end) {
    dates.push(`${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function formatMD(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatTimeRange(startTime, endTime) {
  const start = toTimeOnly(startTime)
  const end = toTimeOnly(endTime)
  if (start && end) return `(${start} – ${end})`
  if (start) return `(${start}~)`
  if (end) return `(~${end})`
  return ''
}

function isFlightGeneratedActivity(raw, lang) {
  if (!raw) return false
  if (raw.flightId) return true
  if (raw.flightRole && ['depart', 'arrive', 'transit'].includes(raw.flightRole)) return true
  const title = bi(raw.title, lang)
  return title.startsWith('✈')
}

export function normalizeExportItem(raw, lang) {
  const isFlight = !!raw.flightNo || !!raw.departAt || !!raw.arriveAt
  if (!isFlight) {
    return {
      type: 'activity',
      date: toDateOnly(raw.date),
      startTime: toTimeOnly(raw.startTime),
      endTime: toTimeOnly(raw.endTime),
      title: bi(raw.title, lang),
      status: raw.status || 'confirmed',
      segmentId: raw.segmentId || '',
    }
  }

  const departDate = toDateOnly(raw.departDate || raw.departAt)
  const arriveDate = toDateOnly(raw.arriveDate || raw.arriveAt)
  const departTime = toTimeOnly(raw.departTime || raw.departAt)
  const arriveTime = toTimeOnly(raw.arriveTime || raw.arriveAt)
  const from = bi(raw.from, lang)
  const to = bi(raw.to, lang)

  return {
    type: 'flight',
    flightNo: String(raw.flightNo || '').trim(),
    airline: String(raw.airline || '').trim(),
    departDate,
    departTime,
    arriveDate,
    arriveTime,
    from,
    to,
  }
}

function flightSegmentLabel(flight, kind, lang) {
  const prefix = [flight.flightNo, flight.airline].filter(Boolean).join(' / ')
  const route = [flight.from, flight.to].filter(Boolean).join('→')
  const action = lang === 'zh-TW'
    ? (kind === 'depart' ? '出發' : '抵達')
    : (kind === 'depart' ? 'Depart' : 'Arrive')

  const timeText = kind === 'depart'
    ? formatTimeRange(flight.departTime, flight.arriveDate === flight.departDate ? flight.arriveTime : '')
    : formatTimeRange('', flight.arriveTime)

  return [prefix, action, route, timeText].filter(Boolean).join(' ')
}

function activitySegmentLabel(activity) {
  const title = activity.title || ''
  const timeText = formatTimeRange(activity.startTime, activity.endTime)
  return [title, timeText].filter(Boolean).join(' ')
}

export function groupByTripDay(items, tripStartDate, tripEndDate) {
  const days = buildTripDates(tripStartDate, tripEndDate).map(date => ({
    date,
    flights: [],
    activities: [],
  }))
  const map = new Map(days.map(day => [day.date, day]))

  items.forEach(item => {
    if (item.type === 'flight') {
      if (item.departDate && map.has(item.departDate)) {
        map.get(item.departDate).flights.push({ ...item, kind: 'depart' })
      }
      if (item.arriveDate && item.arriveDate !== item.departDate && map.has(item.arriveDate)) {
        map.get(item.arriveDate).flights.push({ ...item, kind: 'arrive' })
      }
      return
    }

    if (item.type === 'activity' && item.date && map.has(item.date)) {
      map.get(item.date).activities.push(item)
    }
  })

  days.forEach(day => {
    day.flights.sort((a, b) => {
      const ta = a.kind === 'depart' ? a.departTime : a.arriveTime
      const tb = b.kind === 'depart' ? b.departTime : b.arriveTime
      return (ta || '99:99').localeCompare(tb || '99:99')
    })
    day.activities.sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
  })

  return days
}

export function renderDayLine(dayBucket, dayIndex, lang) {
  // 兩個區域的時間序：機票 + 轉機段活動依時間交錯排列，集中在前面；
  // 其餘正式行程依時間排序放在後面。
  const transitActivities = dayBucket.activities.filter(a => a.segmentId === 'transit')
  const restActivities    = dayBucket.activities.filter(a => a.segmentId !== 'transit')

  const flightGroup = [
    ...dayBucket.flights.map(f => ({
      sortTime: f.kind === 'depart' ? f.departTime : f.arriveTime,
      label: flightSegmentLabel(f, f.kind, lang),
    })),
    ...transitActivities.map(a => ({
      sortTime: a.startTime,
      label: activitySegmentLabel(a),
    })),
  ].sort((a, b) => (a.sortTime || '99:99').localeCompare(b.sortTime || '99:99'))

  const parts = [
    ...flightGroup.map(x => x.label).filter(Boolean),
    ...restActivities.map(activitySegmentLabel).filter(Boolean),
  ]
  const md = formatMD(dayBucket.date)
  return `Day${dayIndex + 1} (${md})：${parts.join('、')}`
}

export function renderFullItinerary(dayBuckets, lang) {
  return dayBuckets.map((day, idx) => renderDayLine(day, idx, lang)).join('\n')
}

export function createItineraryExportText(input) {
  const {
    activities = [],
    flights = [],
    lang = 'zh-TW',
    tripStartDate,
    tripEndDate,
  } = input || {}

  const normalizedActivities = activities
    .filter(activity => !isFlightGeneratedActivity(activity, lang))
    .filter(activity => !activity.alternativeFor)
    .map(activity => normalizeExportItem(activity, lang))
    .filter(item => item.type === 'activity')
    .filter(item => (item.status || 'confirmed') === 'confirmed')

  const normalizedFlights = flights
    .map(flight => normalizeExportItem(flight, lang))
    .filter(item => item.type === 'flight')

  const dayBuckets = groupByTripDay(
    [...normalizedFlights, ...normalizedActivities],
    tripStartDate,
    tripEndDate,
  )

  return renderFullItinerary(dayBuckets, lang)
}

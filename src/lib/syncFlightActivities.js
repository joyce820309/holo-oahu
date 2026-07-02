import {
  collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const TRIP_ID = 'holo-oahu-2026'
const COLL    = () => collection(db, 'trips', TRIP_ID, 'activities')

function bi(zh, en = '') { return { zh, en } }

function parseDateTime(dt) {
  if (!dt) return { date: '', time: '' }
  if (dt.includes('T')) {
    const [date, time] = dt.split('T')
    return { date, time: time?.slice(0, 5) || '' }
  }
  return { date: dt, time: '' }
}

function flightLabel(flight, role) {
  const no   = flight.flightNo || ''
  const from = flight.from?.zh || flight.from || ''
  const to   = flight.to?.zh   || flight.to   || ''
  const fromEn = flight.from?.en || from
  const toEn   = flight.to?.en   || to
  if (role === 'depart') return bi(`✈ ${no} 出發 ${from}→${to}`, `✈ ${no} Depart ${fromEn}→${toEn}`)
  if (role === 'arrive') return bi(`✈ ${no} 抵達 ${to}`,         `✈ ${no} Arrive ${toEn}`)
  return                        bi(`✈ ${no} ${from}→${to}`,      `✈ ${no} ${fromEn}→${toEn}`)
}

async function getExisting(flightId) {
  const snap = await getDocs(query(COLL(), where('flightId', '==', flightId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function upsert(existing, role, data) {
  const found = existing.find(a => a.flightRole === role)
  if (found) {
    await updateDoc(doc(db, 'trips', TRIP_ID, 'activities', found.id), data)
  } else {
    await addDoc(COLL(), { ...data, createdAt: serverTimestamp() })
  }
}

export async function syncFlightToActivities(flightId, flight) {
  const dep = parseDateTime(flight.departAt)
  const arr = parseDateTime(flight.arriveAt)
  const existing = await getExisting(flightId)

  const sameDay = dep.date && arr.date && dep.date === arr.date

  if (sameDay) {
    // One activity spanning the whole flight
    await upsert(existing, 'full', {
      flightId, flightRole: 'full',
      title: flightLabel(flight, 'full'),
      type: 'other',
      date: dep.date,
      startTime: dep.time,
      endTime: arr.time,
      departTerminal: flight.departTerminal || '',
      arriveTerminal: flight.arriveTerminal || '',
    })
    // Remove stale depart/arrive entries if flight was previously cross-day
    for (const a of existing) {
      if (a.flightRole === 'depart' || a.flightRole === 'arrive') {
        await deleteDoc(doc(db, 'trips', TRIP_ID, 'activities', a.id))
      }
    }
  } else {
    // Two activities: depart day + arrive day
    if (dep.date) {
      await upsert(existing, 'depart', {
        flightId, flightRole: 'depart',
        title: flightLabel(flight, 'depart'),
        type: 'other',
        date: dep.date,
        startTime: dep.time,
        endTime: '',
        departTerminal: flight.departTerminal || '',
      })
    }
    if (arr.date) {
      await upsert(existing, 'arrive', {
        flightId, flightRole: 'arrive',
        title: flightLabel(flight, 'arrive'),
        type: 'other',
        date: arr.date,
        startTime: arr.time,
        endTime: '',
        arriveTerminal: flight.arriveTerminal || '',
      })
    }
    // Remove stale full entry
    for (const a of existing) {
      if (a.flightRole === 'full') {
        await deleteDoc(doc(db, 'trips', TRIP_ID, 'activities', a.id))
      }
    }
  }
}

export async function deleteFlightActivities(flightId) {
  const existing = await getExisting(flightId)
  await Promise.all(existing.map(a => deleteDoc(doc(db, 'trips', TRIP_ID, 'activities', a.id))))
}

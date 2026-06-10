import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2026'

export function useHotels() {
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'trips', TRIP_ID, 'hotels'), orderBy('checkIn'))
    const unsub = onSnapshot(q, snap => {
      setHotels(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const addHotel    = data => addDoc(collection(db, 'trips', TRIP_ID, 'hotels'), { ...data, createdAt: serverTimestamp() })
  const updateHotel = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'hotels', id), data)
  const deleteHotel = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'hotels', id))

  return { hotels, loading, addHotel, updateHotel, deleteHotel }
}

import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2025'

export function useFlights() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'trips', TRIP_ID, 'flights'), orderBy('departAt'))
    const unsub = onSnapshot(q, snap => {
      setFlights(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const addFlight    = data => addDoc(collection(db, 'trips', TRIP_ID, 'flights'), { ...data, createdAt: serverTimestamp() })
  const updateFlight = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'flights', id), data)
  const deleteFlight = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'flights', id))

  return { flights, loading, addFlight, updateFlight, deleteFlight }
}

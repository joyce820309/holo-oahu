import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2026'

export function useCarRentals() {
  const [carRentals, setCarRentals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'trips', TRIP_ID, 'carRentals'), orderBy('pickupAt'))
    const unsub = onSnapshot(q, snap => {
      setCarRentals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const addCarRental = data => addDoc(collection(db, 'trips', TRIP_ID, 'carRentals'), { ...data, createdAt: serverTimestamp() })
  const updateCarRental = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'carRentals', id), data)
  const deleteCarRental = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'carRentals', id))

  return { carRentals, loading, addCarRental, updateCarRental, deleteCarRental }
}
import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2026'

export function useActivities() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'trips', TRIP_ID, 'activities'),
      orderBy('date'), orderBy('startTime')
    )
    const unsub = onSnapshot(q, snap => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const addActivity    = data => addDoc(collection(db, 'trips', TRIP_ID, 'activities'), { ...data, createdAt: serverTimestamp() })
  const updateActivity = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'activities', id), data)
  const deleteActivity = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'activities', id))

  return { activities, loading, addActivity, updateActivity, deleteActivity }
}

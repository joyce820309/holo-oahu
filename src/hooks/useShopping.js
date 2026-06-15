import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2026'

export function useShopping() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'trips', TRIP_ID, 'shoppingItems'), orderBy('createdAt'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const addItem    = data => addDoc(collection(db, 'trips', TRIP_ID, 'shoppingItems'), { ...data, createdAt: serverTimestamp() })
  const updateItem = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'shoppingItems', id), data)
  const deleteItem = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'shoppingItems', id))

  return { items, loading, addItem, updateItem, deleteItem }
}

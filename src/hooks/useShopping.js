import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

const TRIP_ID = 'holo-oahu-2026'

export function useShopping() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) {
      setItems([])
      setLoading(false)
      return () => {}
    }

    setLoading(true)
    const q = query(collection(db, 'trips', TRIP_ID, 'users', user.uid, 'shoppingItems'), orderBy('createdAt'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [user?.uid])

  const addItem = data => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return addDoc(collection(db, 'trips', TRIP_ID, 'users', user.uid, 'shoppingItems'), { ...data, createdAt: serverTimestamp() })
  }
  const updateItem = (id, data) => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return updateDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'shoppingItems', id), data)
  }
  const deleteItem = id => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return deleteDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'shoppingItems', id))
  }

  return { items, loading, addItem, updateItem, deleteItem }
}

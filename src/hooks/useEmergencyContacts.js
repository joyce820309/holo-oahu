import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2025'

export function useEmergencyContacts() {
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'trips', TRIP_ID, 'emergency'), orderBy('createdAt'))
    const unsub = onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, () => {})
    return unsub
  }, [])

  const addContact    = data => addDoc(collection(db, 'trips', TRIP_ID, 'emergency'), { ...data, createdAt: serverTimestamp() })
  const deleteContact = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'emergency', id))

  return { contacts, addContact, deleteContact }
}

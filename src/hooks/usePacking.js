import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDocs, setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

const TRIP_ID = 'holo-oahu-2026'

const DEFAULT_CATEGORIES = [
  { id: 'clothing', name: { zh: '衣物', en: 'Clothing' }, order: 0 },
  { id: 'documents', name: { zh: '證件', en: 'Documents' }, order: 1 },
  { id: 'medicine', name: { zh: '藥品', en: 'Medicine' }, order: 2 },
  { id: 'electronics', name: { zh: '電子用品', en: 'Electronics' }, order: 3 },
  { id: 'toiletries', name: { zh: '盥洗用品', en: 'Toiletries' }, order: 4 },
  { id: 'other', name: { zh: '其他', en: 'Other' }, order: 5 },
]

export function usePacking() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!user?.uid) {
      setItems([])
      setCategories([])
      setLoading(false)
      return () => { mounted = false }
    }

    async function seedCategories() {
      const col = collection(db, 'trips', TRIP_ID, 'users', user.uid, 'packingCategories')
      const snap = await getDocs(col)
      if (!mounted || !snap.empty) return

      await Promise.all(DEFAULT_CATEGORIES.map(category => (
        setDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'packingCategories', category.id), {
          ...category,
          builtIn: true,
          createdAt: serverTimestamp(),
        })
      )))
    }

    seedCategories()
    return () => { mounted = false }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setItems([])
      setCategories([])
      setLoading(false)
      return () => {}
    }

    setLoading(true)

    const itemsQuery = query(collection(db, 'trips', TRIP_ID, 'users', user.uid, 'packing'), orderBy('createdAt'))
    const categoriesQuery = query(collection(db, 'trips', TRIP_ID, 'users', user.uid, 'packingCategories'), orderBy('order'))

    let itemsReady = false
    let categoriesReady = false

    const finishLoading = () => {
      if (itemsReady && categoriesReady) setLoading(false)
    }

    const unsubItems = onSnapshot(itemsQuery, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      itemsReady = true
      finishLoading()
    }, () => {
      itemsReady = true
      finishLoading()
    })

    const unsubCategories = onSnapshot(categoriesQuery, snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      categoriesReady = true
      finishLoading()
    }, () => {
      categoriesReady = true
      finishLoading()
    })

    return () => {
      unsubItems()
      unsubCategories()
    }
  }, [user?.uid])

  const addItem = data => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return addDoc(collection(db, 'trips', TRIP_ID, 'users', user.uid, 'packing'), { ...data, createdAt: serverTimestamp() })
  }
  const updateItem = (id, data) => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return updateDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'packing', id), data)
  }
  const deleteItem = id => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return deleteDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'packing', id))
  }

  const addCategory = data => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return addDoc(collection(db, 'trips', TRIP_ID, 'users', user.uid, 'packingCategories'), {
      ...data,
      builtIn: false,
      createdAt: serverTimestamp(),
    })
  }
  const updateCategory = (id, data) => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return updateDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'packingCategories', id), data)
  }
  const deleteCategory = id => {
    if (!user?.uid) return Promise.reject(new Error('Not authenticated'))
    return deleteDoc(doc(db, 'trips', TRIP_ID, 'users', user.uid, 'packingCategories', id))
  }

  return {
    items,
    categories,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}

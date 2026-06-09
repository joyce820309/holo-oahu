import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2025'
const RATES_KEY = 'holo_exchange_rates'
const RATES_TS  = 'holo_exchange_rates_ts'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [rates, setRates]       = useState({ USD: 1, KRW: 1300, TWD: 32 })

  useEffect(() => {
    const q = query(collection(db, 'trips', TRIP_ID, 'expenses'), orderBy('date'), orderBy('createdAt'))
    const unsub = onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  useEffect(() => {
    const cached = localStorage.getItem(RATES_KEY)
    const ts     = parseInt(localStorage.getItem(RATES_TS) || '0', 10)
    if (cached && Date.now() - ts < 86400000) {
      setRates(JSON.parse(cached))
      return
    }
    fetch('https://api.frankfurter.app/latest?from=USD&to=TWD,KRW')
      .then(r => r.json())
      .then(data => {
        const r = { USD: 1, TWD: data.rates.TWD, KRW: data.rates.KRW }
        setRates(r)
        localStorage.setItem(RATES_KEY, JSON.stringify(r))
        localStorage.setItem(RATES_TS, String(Date.now()))
      })
      .catch(() => {})
  }, [])

  const toTWD = (amount, currency) => {
    if (currency === 'TWD') return amount
    if (currency === 'USD') return amount * rates.TWD
    if (currency === 'KRW') return amount * (rates.TWD / rates.KRW)
    return amount
  }

  const addExpense    = data => addDoc(collection(db, 'trips', TRIP_ID, 'expenses'), { ...data, createdAt: serverTimestamp() })
  const updateExpense = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'expenses', id), data)
  const deleteExpense = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'expenses', id))

  return { expenses, loading, rates, toTWD, addExpense, updateExpense, deleteExpense }
}

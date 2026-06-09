import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './lib/i18n'

import Header         from './components/Header'
import BottomNav      from './components/BottomNav'
import OfflineBanner  from './components/OfflineBanner'

import LoginPage        from './pages/LoginPage'
import TripPage         from './pages/TripPage'
import HomePage         from './pages/HomePage'
import ActivitiesPage   from './pages/ActivitiesPage'
import ActivityFormPage from './pages/ActivityFormPage'
import FlightsPage      from './pages/FlightsPage'
import HotelsPage       from './pages/HotelsPage'
import PackingPage      from './pages/PackingPage'
import ExpensesPage     from './pages/ExpensesPage'
import EmergencyPage    from './pages/EmergencyPage'
import MapPage          from './pages/MapPage'
import MembersPage      from './pages/MembersPage'
import SettingsPage     from './pages/SettingsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-secondary">Loading...</p>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppShell() {
  const { user } = useAuth()

  return (
    <div className="app-bg">
      {user && <Header />}
      <OfflineBanner />
      <main style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/" element={<Navigate to="/trip" replace />} />
          <Route path="/trip" element={<ProtectedRoute><TripPage /></ProtectedRoute>}>
            <Route index                element={<HomePage />} />
            <Route path="activities"    element={<ActivitiesPage />} />
            <Route path="activities/new" element={<ActivityFormPage />} />
            <Route path="activities/:id" element={<ActivityFormPage />} />
            <Route path="flights"       element={<FlightsPage />} />
            <Route path="hotels"        element={<HotelsPage />} />
          </Route>
          <Route path="/trip/packing"   element={<ProtectedRoute><PackingPage /></ProtectedRoute>} />
          <Route path="/trip/expenses"  element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
          <Route path="/trip/map"       element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/trip/members"   element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/trip/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </main>
      {user && <BottomNav />}
      <Toaster position="top-center" toastOptions={{
        style: { background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '0.5px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      }} />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './lib/i18n'

import Header         from './components/Header'
import BottomNav      from './components/BottomNav'
import OfflineBanner  from './components/OfflineBanner'
import { ListSkeleton } from './components/Skeleton'

import LoginPage        from './pages/LoginPage'
import TripPage         from './pages/TripPage'
import HomePage         from './pages/HomePage'
import ActivitiesPage   from './pages/ActivitiesPage'
import ActivityFormPage    from './pages/ActivityFormPage'
import ActivityDetailPage  from './pages/ActivityDetailPage'
import TransportEditPage   from './pages/TransportEditPage'
import TravelPage       from './pages/TravelPage'
import FlightsPage      from './pages/FlightsPage'
import HotelsPage       from './pages/HotelsPage'
import HotelDetailPage  from './pages/HotelDetailPage'
import PackingPage           from './pages/PackingPage'
import PackingCategoriesPage from './pages/PackingCategoriesPage'
import ExpensesPage     from './pages/ExpensesPage'
import EmergencyPage    from './pages/EmergencyPage'
import MapPage          from './pages/MapPage'
import MembersPage      from './pages/MembersPage'
import SettingsPage     from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="app-bg min-h-screen">
      <div className="px-4 pt-16 pb-24">
        <ListSkeleton count={4} />
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  return (
    <div className="app-bg">
      {user && !isLoginPage && <Header />}
      <OfflineBanner />
      <main style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/trip" replace /> : <LoginPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/" element={<Navigate to="/trip" replace />} />
          <Route path="/trip" element={<ProtectedRoute><TripPage /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
          </Route>
          <Route path="/trip/activities"                     element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
          <Route path="/trip/activities/new"                 element={<ProtectedRoute><ActivityFormPage /></ProtectedRoute>} />
          <Route path="/trip/activities/:id"                 element={<ProtectedRoute><ActivityDetailPage /></ProtectedRoute>} />
          <Route path="/trip/activities/:id/edit"            element={<ProtectedRoute><ActivityFormPage /></ProtectedRoute>} />
          <Route path="/trip/activities/:id/transport"       element={<ProtectedRoute><TransportEditPage /></ProtectedRoute>} />
          <Route path="/trip/travel"    element={<ProtectedRoute><TravelPage /></ProtectedRoute>} />
          <Route path="/trip/flights"   element={<ProtectedRoute><FlightsPage /></ProtectedRoute>} />
          <Route path="/trip/hotels"    element={<ProtectedRoute><HotelsPage /></ProtectedRoute>} />
          <Route path="/trip/hotels/:id" element={<ProtectedRoute><HotelDetailPage /></ProtectedRoute>} />
          <Route path="/trip/packing"            element={<ProtectedRoute><PackingPage /></ProtectedRoute>} />
          <Route path="/trip/packing/categories" element={<ProtectedRoute><PackingCategoriesPage /></ProtectedRoute>} />
          <Route path="/trip/expenses"  element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
          <Route path="/trip/map"       element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/trip/members"   element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/trip/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/trip/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        </Routes>
      </main>
      {user && !isLoginPage && <BottomNav />}
      <Toaster
        position="top-center"
        containerStyle={{ top: 72 }}
        toastOptions={{
          style: { background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '0.5px solid var(--glass-border)', backdropFilter: 'blur(12px)' },
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--glass-bg)' } },
        }}
      />
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

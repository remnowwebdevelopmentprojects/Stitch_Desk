import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider } from './components/providers/QueryProvider'
import { Login } from './pages/Login'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Customers } from './pages/customers/Customers'
import { Measurements } from './pages/measurements/Measurements'
import { Orders } from './pages/orders/Orders'
import { Invoices } from './pages/invoices/Invoices'
import { Settings } from './pages/settings/Settings'
import { Gallery } from './pages/gallery/Gallery'
import { PublicGallery } from './pages/public/PublicGallery'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/measurements"
            element={
              <ProtectedRoute>
                <Measurements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            }
          />
          {/* Public routes - no auth required */}
          <Route path="/gallery/:shopId" element={<PublicGallery />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App

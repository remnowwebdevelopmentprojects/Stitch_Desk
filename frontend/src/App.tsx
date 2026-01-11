import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider } from './components/providers/QueryProvider'
import { Landing } from './pages/landing/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { GoogleCallback } from './pages/GoogleCallback'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Customers } from './pages/customers/Customers'
import { Measurements } from './pages/measurements/Measurements'
import { Orders } from './pages/orders/Orders'
import { Invoices } from './pages/invoices/Invoices'
import { Settings } from './pages/settings/Settings'
import { Gallery } from './pages/gallery/Gallery'
import { Inventory } from './pages/inventory/Inventory'
import { PublicGallery } from './pages/public/PublicGallery'
import { TermsOfService } from './pages/static/TermsOfService'
import { PrivacyPolicy } from './pages/static/PrivacyPolicy'
import { About } from './pages/static/About'
import { HelpCenter } from './pages/static/HelpCenter'
import { Documentation } from './pages/static/Documentation'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/gallery/:shopId" element={<PublicGallery />} />

          {/* Static pages */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/docs" element={<Documentation />} />

          {/* Protected routes */}
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
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App

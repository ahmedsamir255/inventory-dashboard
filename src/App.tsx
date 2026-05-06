import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import SyncProvider from './components/SyncProvider'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import HomePage from './pages/Home'
import Dashboard from './pages/Dashboard'
import Branches from './pages/Branches'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import StockAnalysis from './pages/StockAnalysis'
import StockTake from './pages/StockTake'
import Audits from './pages/Audits'
import Damaged from './pages/Damaged'
import Sales from './pages/Sales'
import Users from './pages/Users'
import Reports from './pages/Reports'
import Analysis from './pages/Analysis'

export default function App() {
  const currentUser = useAuthStore(s => s.currentUser)

  if (!currentUser) return <Login />

  return (
    <BrowserRouter>
      <SyncProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="ml-56 flex-1 p-4 overflow-x-hidden">
            <Routes>
              <Route path="/"          element={<HomePage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/branches"  element={<Branches />} />
              <Route path="/products"  element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/stocktake" element={<StockTake />} />
              <Route path="/audits"    element={<Audits />} />
              <Route path="/damaged"   element={<Damaged />} />
              <Route path="/sales"     element={<Sales />} />
              <Route path="/users"     element={<Users />} />
              <Route path="/reports"   element={<Reports />} />
              <Route path="/analysis"  element={<Analysis />} />
              <Route path="*"          element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </SyncProvider>
    </BrowserRouter>
  )
}





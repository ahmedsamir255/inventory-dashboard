import { useAuthStore } from '../store/useAuthStore'
import { NavLink } from 'react-router-dom'
const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/branches', label: 'Branches', icon: '🏢' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/inventory', label: 'Inventory', icon: '🗄️' },
  { to: '/stock-analysis', label: 'Stock Analysis', icon: '📊' },
  { to: '/stocktake', label: 'Stock Take', icon: '📋' },
  { to: '/audits', label: 'Audits', icon: '🔍' },
  { to: '/damaged', label: 'Damaged / Waste', icon: '⚠️' },
  { to: '/sales', label: 'Sales', icon: '💰' },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/reports', label: 'Reports', icon: '📈' },
]
export default function Sidebar() {
  const { currentUser, logout } = useAuthStore()
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-red-800 text-white flex flex-col z-40">
      <div className="border-b border-red-700 flex flex-col items-center bg-red-800 py-4"><div className="bg-white rounded-lg p-1 mx-6"><img src="/logo.png" alt="Alsaif Gallery" className="w-48 object-contain" /></div><p className="text-xs text-red-200 mt-2 tracking-wide px-4 text-center font-bold">Inventory & Stock Control</p></div>
      <nav className="flex-1 overflow-y-auto py-3">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to==='/'} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive?'bg-black text-white font-medium':'text-red-100 hover:bg-red-700'}`}>
            <span>{l.icon}</span><span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-red-700 px-4 py-3 space-y-2"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">{currentUser?.name.charAt(0)}</div><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-white truncate">{currentUser?.name}</p><p className="text-xs text-red-300">{currentUser?.role}</p></div></div><button onClick={logout} className="w-full text-xs text-red-200 hover:text-white hover:bg-red-700 rounded-lg py-1.5 transition-colors text-center">تسجيل الخروج</button></div>
    </aside>
  )
}

















import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useInventoryStore } from '../store/useInventoryStore'

const cards = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '📊', desc: 'KPIs & performance',  color: 'from-blue-500 to-blue-700' },
  { to: '/branches',   label: 'Branches',   icon: '🏢', desc: 'Manage branches',      color: 'from-indigo-500 to-indigo-700' },
  { to: '/products',   label: 'Products',   icon: '📦', desc: 'SKU & pricing',         color: 'from-violet-500 to-violet-700' },
  { to: '/inventory',  label: 'Inventory',  icon: '🗄️', desc: 'Stock & transfers',     color: 'from-cyan-500 to-cyan-700' },
  { to: '/stocktake',  label: 'Stock Take', icon: '📋', desc: 'Physical counts',       color: 'from-teal-500 to-teal-700' },
  { to: '/audits',     label: 'Audits',     icon: '🔍', desc: 'Visits & notes',        color: 'from-sky-500 to-sky-700' },
  { to: '/damaged',    label: 'Damaged',    icon: '⚠️', desc: 'Damage & loss',         color: 'from-red-500 to-red-700' },
  { to: '/sales',      label: 'Sales',      icon: '💰', desc: 'Monthly sales',         color: 'from-emerald-500 to-emerald-700' },
  { to: '/users',      label: 'Users',      icon: '👥', desc: 'Roles & access',        color: 'from-orange-500 to-orange-700' },
  { to: '/reports',    label: 'Reports',    icon: '📈', desc: 'Analytics',             color: 'from-pink-500 to-pink-700' },
]

export default function HomePage() {
  const { branches, products, stocks, sales, damages } = useInventoryStore()
  const fmt = (n: number) => n.toLocaleString('en-US') + ' ر.س'
  const today = format(new Date(), 'EEEE, MMMM d yyyy')
  const thisMonth = format(new Date(), 'yyyy-MM')

  const totalStock = stocks.reduce((a, s) => {
    const p = products.find(pr => pr.id === s.productId)
    return a + (p ? p.unitCost * s.quantity : 0)
  }, 0)
  const monthlySales = sales.filter(s => s.month === thisMonth).reduce((a, s) => a + s.amount, 0)
  const totalDamage  = damages.reduce((a, d) => a + d.cost, 0)

  const stats = [
    { label: 'Active Branches', value: String(branches.filter(b => b.status === 'Active').length), icon: '🏢', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Total Products',  value: String(products.length),  icon: '📦', color: 'text-violet-700 bg-violet-50 border-violet-200' },
    { label: 'Stock Value',     value: fmt(totalStock),          icon: '🏭', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    { label: 'Monthly Sales',   value: fmt(monthlySales),        icon: '💰', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Damage / Waste',  value: fmt(totalDamage),         icon: '⚠️', color: 'text-red-700 bg-red-50 border-red-200' },
    { label: 'Total Branches',  value: String(branches.length),  icon: '🏗️', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  ]

  return (
    <div className="space-y-3">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-red-800 to-red-900 text-white px-8 py-8">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-xl p-3 flex-shrink-0">
            <img src="/logo.png" alt="Alsaif Gallery" className="h-20 object-contain" />
          </div>
          <div className="flex-1">
            <p className="text-red-300 text-sm">{today}</p>
            <h1 className="text-2xl font-bold mt-1">Alsaif Gallery</h1>
            <p className="text-red-100 text-sm mt-1">Inventory & Stock Control</p>
            <p className="text-red-300 text-xs mt-2">Centralized management for all branches — track stock, sales, audits, and performance from one place.</p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Link to="/dashboard" className="px-6 py-2.5 bg-black hover:bg-gray-900 rounded-lg text-sm font-semibold text-center">View Dashboard</Link>
            <Link to="/reports"   className="px-6 py-2.5 border border-white/30 hover:bg-white/10 rounded-lg text-sm font-semibold text-center">Open Reports</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quick Overview</p>
        <div className="grid grid-cols-3 gap-2">
          {stats.map(s => (
            <div key={s.label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${s.color}`}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xs font-semibold uppercase opacity-60">{s.label}</p>
                <p className="text-base font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Modules</p>
        <div className="grid grid-cols-5 gap-3">
          {cards.map(c => (
            <Link key={c.to} to={c.to} className="group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 hover:-translate-y-0.5">
              <div className={`bg-gradient-to-br ${c.color} flex items-center justify-center py-5`}>
                <span className="text-3xl">{c.icon}</span>
              </div>
              <div className="bg-white px-3 py-2">
                <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-600">{c.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}



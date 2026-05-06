import { useState, useMemo, useEffect } from 'react'
import { format, subMonths } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { useInventoryStore } from '../store/useInventoryStore'
import { exportToExcel } from '../utils/exportExcel'

const API = 'http://localhost:3005/api'
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899']
const fmt = (n: number) => n.toLocaleString('en-US') + ' ر.س'

type ReportType = 'inventory' | 'sales' | 'damage' | 'stocktake' | 'products'

interface Analytics {
  total: number
  totalValue: number
  totalSalesValue: number
  byCategory: { name: string; count: number; value: number }[]
  zeroQty: number
  lowStock: number
  singleUnit: number
  topByValue: { sku: string; description: string; qty: number; unitCost: number; totalValue: number }[]
}

export default function Reports() {
  const { branches, stocks, damages, sales, stockTakes, audits } = useInventoryStore()
  const [active, setActive] = useState<ReportType>('inventory')
  const [branchFilter, setBranchFilter] = useState('all')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    if (active === 'products' || active === 'inventory') {
      setAnalyticsLoading(true)
      fetch(`${API}/products/analytics`)
        .then(r => r.json())
        .then(d => { setAnalytics(d); setAnalyticsLoading(false) })
        .catch(() => setAnalyticsLoading(false))
    }
  }, [active])

  const inventoryRows = useMemo(() => branches
    .filter(b => branchFilter === 'all' || b.id === branchFilter)
    .map(b => {
      const branchStocks = stocks.filter(s => s.branchId === b.id)
      const totalQty = branchStocks.reduce((a, s) => a + s.quantity, 0)
      const zeroStock = branchStocks.filter(s => s.quantity === 0).length
      return { branch: b.name, manager: b.manager, totalQty, zeroStock, lines: branchStocks.length }
    }), [branches, stocks, branchFilter])

  const salesTrend = useMemo(() => Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(new Date(), 5 - i)
    const m = format(d, 'yyyy-MM')
    const e: Record<string, string | number> = { month: format(d, 'MMM yy') }
    branches.forEach(b => { e[b.name.replace(' Branch', '')] = sales.filter(s => s.branchId === b.id && s.month === m).reduce((a, s) => a + s.amount, 0) })
    return e
  }), [branches, sales])

  const salesByBranch = useMemo(() => branches.map(b => ({
    name: b.name.replace(' Branch', ''),
    total: sales.filter(s => s.branchId === b.id).reduce((a, s) => a + s.amount, 0),
    units: sales.filter(s => s.branchId === b.id).reduce((a, s) => a + s.units, 0),
  })).sort((a, b) => b.total - a.total), [branches, sales])

  const damageByReason = useMemo(() => {
    const map: Record<string, number> = {}
    damages.forEach(d => { map[d.reason] = (map[d.reason] ?? 0) + d.cost })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [damages])

  const damageByBranch = useMemo(() => branches.map(b => ({
    name: b.name.replace(' Branch', ''),
    cost: damages.filter(d => d.branchId === b.id).reduce((a, d) => a + d.cost, 0),
    records: damages.filter(d => d.branchId === b.id).length,
  })), [branches, damages])

  const stockTakeStats = useMemo(() => stockTakes.flatMap(st =>
    st.items.map(i => ({
      date: st.date,
      branch: branches.find(b => b.id === st.branchId)?.name ?? '',
      productId: i.productId,
      systemQty: i.systemQty,
      actualQty: i.actualQty,
      variance: i.actualQty - i.systemQty,
      pct: i.systemQty ? ((i.actualQty - i.systemQty) / i.systemQty * 100).toFixed(1) + '%' : '0%',
    }))
  ), [stockTakes, branches])

  const handleExport = () => {
    if (active === 'inventory') exportToExcel(inventoryRows.map(r => ({ Branch: r.branch, Manager: r.manager, Lines: r.lines, 'Total Qty': r.totalQty, 'Zero Stock Lines': r.zeroStock })), 'Report_Inventory')
    if (active === 'sales') exportToExcel(salesByBranch.map(r => ({ Branch: r.name, 'Total Sales': r.total, 'Units Sold': r.units })), 'Report_Sales')
    if (active === 'damage') exportToExcel(damages.map(d => ({ Date: d.date, Branch: branches.find(b => b.id === d.branchId)?.name, Qty: d.quantity, Reason: d.reason, Cost: d.cost })), 'Report_Damage')
    if (active === 'stocktake') exportToExcel(stockTakeStats, 'Report_StockTake')
    if (active === 'products' && analytics) exportToExcel(analytics.topByValue, 'Report_Products_Top10')
  }

  const tabs: { key: ReportType; label: string; icon: string }[] = [
    { key: 'inventory', label: 'Inventory', icon: '🗄️' },
    { key: 'sales',     label: 'Sales',     icon: '💰' },
    { key: 'damage',    label: 'Damage',    icon: '⚠️' },
    { key: 'stocktake', label: 'Stock Take',icon: '📋' },
    { key: 'products',  label: 'Products',  icon: '📦' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <select className="border rounded-lg px-3 py-2 text-sm" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Export Excel</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Print</button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total Stock Value</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{fmt(analytics?.totalValue ?? 0)}</p>
          <p className="text-xs text-blue-500 mt-1">{(analytics?.total ?? 0).toLocaleString()} products</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Total Sales</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{fmt(sales.reduce((a, s) => a + s.amount, 0))}</p>
          <p className="text-xs text-green-500 mt-1">{sales.reduce((a, s) => a + s.units, 0).toLocaleString()} units</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Total Damage Cost</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{fmt(damages.reduce((a, d) => a + d.cost, 0))}</p>
          <p className="text-xs text-red-500 mt-1">{damages.length} records</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Audits</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{audits.length}</p>
          <p className="text-xs text-purple-500 mt-1">{audits.filter(a => a.status === 'Completed').length} completed</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active === t.key ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {active === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-700">Stock Summary by Branch</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>{['Branch','Manager','Lines','Total Qty','Zero Stock'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {inventoryRows.map(r => (
                  <tr key={r.branch} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.branch}</td>
                    <td className="px-4 py-3 text-gray-600">{r.manager}</td>
                    <td className="px-4 py-3 text-gray-600">{r.lines}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{r.totalQty.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.zeroStock > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.zeroStock}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analyticsLoading && <div className="text-center text-gray-400 py-4">Loading analytics...</div>}
          {analytics && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Products Value by Category</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-orange-500 uppercase font-semibold">Zero Qty</p>
                  <p className="text-xl font-bold text-orange-700">{analytics.zeroQty.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-yellow-500 uppercase font-semibold">Single Unit</p>
                  <p className="text-xl font-bold text-yellow-700">{analytics.singleUnit.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-500 uppercase font-semibold">Total SKUs</p>
                  <p className="text-xl font-bold text-blue-700">{analytics.total.toLocaleString()}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.byCategory}>
                  <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(Number(v)/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v)=>fmt(Number(v))}/>
                  <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} name="Value"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {active === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Sales Trend — 6 Months</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesTrend}>
                <XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}} tickFormatter={v=>`${(Number(v)/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v)=>fmt(Number(v))}/><Legend/>
                {branches.map((b,i)=><Line key={b.id} type="monotone" dataKey={b.name.replace(' Branch','')} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={false}/>)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-700">Sales by Branch</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>{['Rank','Branch','Total Sales','Units Sold','Avg per Month'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {salesByBranch.map((r,i) => (
                  <tr key={r.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold text-white ${i===0?'bg-yellow-400':i===1?'bg-gray-400':'bg-orange-400'}`}>{i+1}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{fmt(r.total)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.units.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(Math.round(r.total / 6))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'damage' && (
        <div className="space-y-6">
          <div className="grid xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Damage Cost by Reason</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={damageByReason} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value})=>`${name}: ${value}`}>
                    {damageByReason.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>fmt(Number(v))}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Damage Cost by Branch</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={damageByBranch}>
                  <XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/>
                  <Tooltip formatter={(v)=>fmt(Number(v))}/>
                  <Bar dataKey="cost" fill="#ef4444" radius={[4,4,0,0]} name="Cost"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-700">Damage Records</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>{['Date','Branch','Qty','Reason','Cost'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {damages.map(d=>(
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{d.date}</td>
                    <td className="px-4 py-3 text-gray-800">{branches.find(b=>b.id===d.branchId)?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.quantity}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{d.reason}</span></td>
                    <td className="px-4 py-3 font-bold text-red-600">{fmt(d.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr><td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td><td className="px-4 py-3 font-bold text-red-600">{fmt(damages.reduce((a,d)=>a+d.cost,0))}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {active === 'stocktake' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-700">Variance Report — All Stock Takes</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{['Date','Branch','Product ID','System Qty','Actual Qty','Variance','%'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {stockTakeStats.map((r,i)=>(
                <tr key={i} className={`hover:bg-gray-50 ${r.variance<0?'bg-red-50':r.variance>0?'bg-green-50':''}`}>
                  <td className="px-4 py-3 text-gray-600">{r.date}</td>
                  <td className="px-4 py-3 text-gray-800">{r.branch}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.productId}</td>
                  <td className="px-4 py-3 text-gray-600">{r.systemQty}</td>
                  <td className="px-4 py-3 text-gray-600">{r.actualQty}</td>
                  <td className={`px-4 py-3 font-bold ${r.variance<0?'text-red-600':r.variance>0?'text-green-600':'text-gray-400'}`}>{r.variance>0?'+':''}{r.variance}</td>
                  <td className={`px-4 py-3 text-xs ${r.variance<0?'text-red-500':r.variance>0?'text-green-500':'text-gray-400'}`}>{r.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active === 'products' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">⏳</div>
              <p>Loading product analytics...</p>
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Products</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{analytics.total.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 font-semibold uppercase">Total Stock Value</p>
                  <p className="text-xl font-bold text-green-700 mt-1">{fmt(analytics.totalValue)}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-orange-600 font-semibold uppercase">Zero Qty Items</p>
                  <p className="text-2xl font-bold text-orange-700 mt-1">{analytics.zeroQty.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-yellow-600 font-semibold uppercase">Single Unit Items</p>
                  <p className="text-2xl font-bold text-yellow-700 mt-1">{analytics.singleUnit.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Stock Value by Category</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analytics.byCategory}>
                    <XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>`${(Number(v)/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={(v)=>fmt(Number(v))}/>
                    <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} name="Value (ر.س)"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-700">Top 10 Products by Value</h2></div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b"><tr>{['SKU','Description','Qty','Unit Cost','Total Value'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {analytics.topByValue.map(r=>(
                      <tr key={r.sku} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{r.sku}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{r.description}</td>
                        <td className="px-4 py-3 text-gray-700">{r.qty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(r.unitCost)}</td>
                        <td className="px-4 py-3 font-bold text-green-700">{fmt(r.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              Could not load analytics. Make sure the server is running.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
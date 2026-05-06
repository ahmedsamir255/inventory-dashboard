import { useInventoryStore } from '../store/useInventoryStore'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const

export default function Analysis() {
  const { inv2025, branches } = useInventoryStore()

  // Branches that have 2025 data
  const totalBranches = new Set(inv2025.map(i => i.branchId)).size

  // Grand total: sum of all months + col997 across all records
  const grandTotal = inv2025.reduce((sum, item) => {
    const monthsTotal = Object.values(item.months || {}).reduce((a, b) => Number(a) + Number(b), 0)
    return sum + monthsTotal + (item.col997 || 0)
  }, 0)

  // Monthly totals across all branches (Jan–Dec + 997)
  const monthlyTotals: Record<string, number> = {}
  MONTHS.forEach(m => { monthlyTotals[m] = 0 })
  let total997 = 0
  inv2025.forEach(item => {
    MONTHS.forEach(m => { monthlyTotals[m] += Number((item.months || {})[m] || 0) })
    total997 += Number(item.col997 || 0)
  })

  const monthlyChartData = [
    ...MONTHS.map(m => ({ name: m, total: monthlyTotals[m] })),
    { name: '997', total: total997 }
  ]

  // Best & Worst month (Jan–Dec + 997)
  const bestMonth = monthlyChartData.reduce((a, b) => (b.total > a.total ? b : a), monthlyChartData[0] || { name: '-', total: 0 })
  const worstMonth = monthlyChartData.reduce((a, b) => (b.total < a.total ? b : a), monthlyChartData[0] || { name: '-', total: 0 })

  // Per-branch totals
  const branchTotals = inv2025.map(item => {
    const monthsTotal = Object.values(item.months || {}).reduce((a, b) => Number(a) + Number(b), 0)
    const branchGrand = monthsTotal + (item.col997 || 0)
    const branch = branches.find(b => b.id === item.branchId)
    return {
      id: item.id,
      branchId: item.branchId,
      branchName: branch?.name || item.branchId,
      months: item.months || {},
      col997: item.col997 || 0,
      grandTotal: branchGrand
    }
  }).sort((a, b) => b.grandTotal - a.grandTotal)

  const top10 = branchTotals.slice(0, 10)
  const bottom10 = [...branchTotals].sort((a, b) => a.grandTotal - b.grandTotal).slice(0, 10)

  const fmt = (n: number) => n.toLocaleString()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Results 2025 Analysis</h1>
          <p className="text-sm text-gray-500">Based on 2025 monthly inventory data</p>
        </div>

        {/* 1. KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-600 text-white rounded-xl p-4 shadow">
            <p className="text-xs opacity-75">Total Branches (2025 Data)</p>
            <p className="text-3xl font-extrabold">{totalBranches}</p>
          </div>
          <div className="bg-red-600 text-white rounded-xl p-4 shadow">
            <p className="text-xs opacity-75">Grand Total</p>
            <p className="text-2xl font-extrabold">{fmt(grandTotal)}</p>
          </div>
          <div className="bg-green-600 text-white rounded-xl p-4 shadow">
            <p className="text-xs opacity-75">Best Month</p>
            <p className="text-2xl font-extrabold">{bestMonth.name}</p>
            <p className="text-xs opacity-80">{fmt(bestMonth.total)}</p>
          </div>
          <div className="bg-orange-500 text-white rounded-xl p-4 shadow">
            <p className="text-xs opacity-75">Worst Month</p>
            <p className="text-2xl font-extrabold">{worstMonth.name}</p>
            <p className="text-xs opacity-80">{fmt(worstMonth.total)}</p>
          </div>
        </div>

        {/* 2. Monthly Trend Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-700 mb-4">Monthly Trend (Jan–Dec + 997)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => (Number(v) || 0).toLocaleString()} />
                <Line type="monotone" dataKey="total" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Top / Bottom Branches */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top 10 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-700 mb-4">Top 10 Branches by Total</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Branch</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((b, i) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 font-medium truncate max-w-[140px]">{b.branchName}</td>
                    <td className="py-1 text-right font-semibold text-green-700">{fmt(b.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom 10 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-700 mb-4">Bottom 10 Branches by Total</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Branch</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {bottom10.map((b, i) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 font-medium truncate max-w-[140px]">{b.branchName}</td>
                    <td className="py-1 text-right font-semibold text-red-600">{fmt(b.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Monthly Breakdown Table */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-700 mb-4">Monthly Breakdown (All Branches)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyChartData.map(row => (
                  <tr key={row.name} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-right">{fmt(row.total)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-100 font-bold">
                  <td className="px-3 py-2">Grand Total</td>
                  <td className="px-3 py-2 text-right">{fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Branch Details Table */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-700 mb-4">Branch Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-2 py-2 text-left sticky left-0 bg-gray-50">Branch</th>
                  {MONTHS.map(m => (
                    <th key={m} className="px-2 py-2 text-right">{m}</th>
                  ))}
                  <th className="px-2 py-2 text-right">997</th>
                  <th className="px-2 py-2 text-right font-bold">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {branchTotals.map(b => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-1 font-medium sticky left-0 bg-white max-w-[150px] truncate">{b.branchName}</td>
                    {MONTHS.map(m => (
                      <td key={m} className="px-2 py-1 text-right">{fmt(Number((b.months as any)[m] || 0))}</td>
                    ))}
                    <td className="px-2 py-1 text-right">{fmt(b.col997)}</td>
                    <td className="px-2 py-1 text-right font-bold text-blue-700">{fmt(b.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2">
                  <td className="px-2 py-2 sticky left-0 bg-gray-100">Total</td>
                  {MONTHS.map(m => (
                    <td key={m} className="px-2 py-2 text-right">{fmt(monthlyTotals[m])}</td>
                  ))}
                  <td className="px-2 py-2 text-right">{fmt(total997)}</td>
                  <td className="px-2 py-2 text-right text-red-700">{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

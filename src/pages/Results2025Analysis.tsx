import { useState } from 'react'
import { useInventoryStore } from '../store/useInventoryStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function Results2025Analysis({ isOpen, onClose }: Props) {
  const { inv2025, branches } = useInventoryStore()
  const [view, setView] = useState<'summary'|'branches'|'months'>('summary')
  
  if (!isOpen) return null
  
  // Calculate monthly totals
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','997']
  const monthlyTotals = months.map(m => ({
    name: m,
    total: inv2025.reduce((sum, item) => {
      if (m === '997') return sum + (item.col997 || 0)
      return sum + ((item.months as Record<string, number>)?.[m] || 0)
    }, 0)
  }))
  
  // Calculate branch totals
  const branchTotals = inv2025.map(item => {
    const branch = branches.find(b => b.id === item.branchId)
    const monthsTotal = Object.values(item.months || {}).reduce((a, b) => Number(a) + Number(b), 0)
    const total = monthsTotal + (item.col997 || 0)
    const row: Record<string, unknown> = {
      name: branch?.name || item.branchId,
      code: branch?.branchCode || '',
      total,
      ...(item.months as Record<string, number>),
      col997: item.col997 || 0
    }
    return row
  }).sort((a, b) => (b.total as number) - (a.total as number))
  
  const grandTotal = branchTotals.reduce((sum, b) => sum + (b.total as number), 0)
  
  const exportData = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      grandTotal,
      monthlyTotals,
      branchTotals: branchTotals.slice(0, 50)
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Results2025_Analysis_${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
          <h2 className="text-xl font-bold text-white">📊 Results 2025 Analysis</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg">
              ↓ Export
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white text-xl font-bold">
              ✕
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b">
          {(['summary','branches','months'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize ${view === v ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {v}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Summary View */}
          {view === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm text-blue-600">Total Branches</p>
                  <p className="text-2xl font-bold text-blue-700">{inv2025.length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl">
                  <p className="text-sm text-red-600">Grand Total</p>
                  <p className="text-2xl font-bold text-red-700">{grandTotal.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-sm text-green-600">Best Month</p>
                  <p className="text-2xl font-bold text-green-700">{[...monthlyTotals].sort((a,b)=>b.total-a.total)[0]?.name}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl">
                  <p className="text-sm text-orange-600">Worst Month</p>
                  <p className="text-2xl font-bold text-orange-700">{[...monthlyTotals].sort((a,b)=>a.total-b.total)[0]?.name}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-bold mb-4">Monthly Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTotals}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#DC2626" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {/* Branches View */}
          {view === 'branches' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Branch Code</th>
                    <th className="px-4 py-2 text-left">Branch Name</th>
                    {months.map(m => <th key={m} className="px-2 py-2 text-right">{m}</th>)}
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {branchTotals.map((b, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-4 py-2 font-mono">{b.code as string}</td>
                      <td className="px-4 py-2">{b.name as string}</td>
                      {months.map(m => {
                        const colKey = m === '997' ? 'col997' : m
                        const val = (b[colKey] as number) || 0
                        return (
                          <td key={m} className={`px-2 py-2 text-right ${val < 0 ? 'text-red-600' : ''}`}>
                            {val.toLocaleString()}
                          </td>
                        )
                      })}
                      <td className={`px-4 py-2 text-right font-bold ${(b.total as number) < 0 ? 'text-red-600' : ''}`}>
                        {(b.total as number).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Months View */}
          {view === 'months' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {monthlyTotals.map(m => (
                <div key={m.name} className={`p-4 rounded-xl ${m.total < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-sm ${m.total < 0 ? 'text-red-600' : 'text-green-600'}`}>{m.name}</p>
                  <p className={`text-2xl font-bold ${m.total < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {m.total.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

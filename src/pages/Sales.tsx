import { useState } from 'react'
import { exportToExcel } from '../utils/exportExcel'
import { format, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useInventoryStore } from '../store/useInventoryStore'
import type { Sale } from '../types'
import AnalyticsModal from '../components/AnalyticsModal'
import KpiCard from '../components/KpiCard'

const COLORS = ['#3b82f6','#10b981','#f59e0b']
const empty: Omit<Sale,'id'> = { branchId:'', month: format(new Date(),'yyyy-MM'), amount:0, units:0 }

export default function Sales() {
  const { branches, sales, addSale, updateSale, deleteSale , clearAllSales} = useInventoryStore()
  const doExport = () => exportToExcel(sales.map(s=>({Month:s.month,Branch:branches.find(b=>b.id===s.branchId)?.name,'Amount (SAR)':s.amount,'Units Sold':s.units})), 'Sales')
  const [form, setForm] = useState<Omit<Sale,'id'>>(empty)
  const [editing, setEditing] = useState<Sale|null>(null)
  const [open, setOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (s: Sale) => { setEditing(s); setForm({branchId:s.branchId,month:s.month,amount:s.amount,units:s.units}); setOpen(true) }
  const save = () => {
    if (!form.branchId) return
    if (editing) updateSale({...form,id:editing.id})
    else addSale(form)
    setOpen(false)
  }

  // Top 10 branches by total sales
  const top10Branches = [...branches].sort((a,b)=>{
    const aTotal = sales.filter(s=>s.branchId===a.id).reduce((x,s)=>x+s.amount,0)
    const bTotal = sales.filter(s=>s.branchId===b.id).reduce((x,s)=>x+s.amount,0)
    return bTotal-aTotal
  }).slice(0,10)

  const chartData = Array.from({length:6}).map((_,i)=>{
    const d = subMonths(new Date(),5-i)
    const m = format(d,'yyyy-MM')
    const e: Record<string,string|number> = { month: format(d,'MMM yy') }
    top10Branches.forEach(b=>{ e[b.name.slice(0,15)] = sales.filter(s=>s.branchId===b.id&&s.month===m).reduce((a,s)=>a+s.amount,0) })
    return e
  })

  const totalThisMonth = sales.filter(s=>s.month===format(new Date(),'yyyy-MM')).reduce((a,s)=>a+s.amount,0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Sales</h1><p className="text-sm text-gray-500">This month: <span className="font-semibold text-green-600">${totalThisMonth.toLocaleString()}</span></p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>{if(confirm("Clear ALL sales?")){clearAllSales()}}} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">Clear All</button>
          <button onClick={doExport} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Export Excel</button>
          <button onClick={()=>setShowAnalytics(true)} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800">📊 Analytics</button>
          <button onClick={openAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">+ Add Sale</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Sales by Branch (6 months)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>`${(Number(v)/1000).toFixed(0)}k ر`}/>
            <Tooltip formatter={(v)=>`${Number(v).toLocaleString()} ر.س`}/>
            {top10Branches.map((b,i)=><Bar key={b.id} dataKey={b.name.slice(0,15)} fill={COLORS[i%COLORS.length]} radius={[3,3,0,0]}/>)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{['Month','Branch','Amount','Units','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {[...sales].sort((a,b)=>b.month.localeCompare(a.month)).map(s=>(
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{s.month}</td>
                <td className="px-4 py-3 text-gray-800">{branches.find(b=>b.id===s.branchId)?.name}</td>
                <td className="px-4 py-3 font-semibold text-green-700">${s.amount.toLocaleString()} ر.س</td>
                <td className="px-4 py-3 text-gray-600">{s.units}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={()=>openEdit(s)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={()=>deleteSale(s.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing?'Edit Sale':'Add Sale'}</h2>
            <div><label className="text-xs font-medium text-gray-600">Branch</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}>
                <option value="">Select</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Month</label><input type="month" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.month} onChange={e=>setForm({...form,month:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Amount ($)</label><input type="number" min={0} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.amount} onChange={e=>setForm({...form,amount:+e.target.value})}/></div>
              <div><label className="text-xs font-medium text-gray-600">Units Sold</label><input type="number" min={0} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.units} onChange={e=>setForm({...form,units:+e.target.value})}/></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Sales Analytics"
        onExport={doExport}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Total Records" value={sales.length} color="blue" icon="📋" />
          <KpiCard title="This Month" value={totalThisMonth.toLocaleString()+' ر.س'} color="green" icon="📅" />
          <KpiCard title="Total Sales" value={sales.reduce((s,x)=>s+x.amount,0).toLocaleString()+' ر.س'} color="purple" icon="💰" />
          <KpiCard title="Total Units" value={sales.reduce((s,x)=>s+x.units,0).toLocaleString()} color="orange" icon="📦" />
        </div>

        {/* Top branches by total sales */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">🏆 Top Branches by Sales</h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['#','Branch','Total Amount (ر.س)','Total Units'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {[...branches].map(b=>({
                  ...b,
                  totalAmount: sales.filter(s=>s.branchId===b.id).reduce((x,s)=>x+s.amount,0),
                  totalUnits: sales.filter(s=>s.branchId===b.id).reduce((x,s)=>x+s.units,0),
                })).filter(b=>b.totalAmount>0).sort((a,b2)=>b2.totalAmount-a.totalAmount).map((b,i)=>(
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 font-bold">{i+1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{b.name}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">{b.totalAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{b.totalUnits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnalyticsModal>
    </div>
  )
}






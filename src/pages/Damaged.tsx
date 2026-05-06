import { useState } from 'react'
import { exportToExcel } from '../utils/exportExcel'
import { useInventoryStore } from '../store/useInventoryStore'
import type { DamageRecord } from '../types'
import AnalyticsModal from '../components/AnalyticsModal'
import KpiCard from '../components/KpiCard'

const REASONS = ['Damage','Expiry','Loss','Other']
const empty: Omit<DamageRecord,'id'> = { branchId:'', productId:'', quantity:1, reason:'Damage', date: new Date().toISOString().slice(0,10), cost:0 }

export default function Damaged() {
  const { branches, products, damages, addDamage, deleteDamage , clearAllDamages} = useInventoryStore()
  const doExport = () => exportToExcel(damages.map(d=>({Date:d.date,Branch:branches.find(b=>b.id===d.branchId)?.name,Product:products.find(p=>p.id===d.productId)?.description,Quantity:d.quantity,Reason:d.reason,'Cost (SAR)':d.cost})), 'Damaged_Waste')
  const [form, setForm] = useState<Omit<DamageRecord,'id'>>(empty)
  const [open, setOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const totalCost = damages.reduce((s,d)=>s+d.cost,0)
  const save = () => {
    if (!form.branchId||!form.productId) return
    addDamage(form)
    setOpen(false)
    setForm(empty)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Damaged / Waste</h1>
          <p className="text-sm text-gray-500">{damages.length} records · Total cost: <span className="font-semibold text-red-600">${totalCost.toLocaleString()} ر.س</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>{if(confirm("Clear ALL damaged records?")){clearAllDamages()}}} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">Clear All</button>
          <button onClick={doExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Export Excel</button>
          <button onClick={()=>setShowAnalytics(true)} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800">📊 Analytics</button>
          <button onClick={()=>setOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">+ Record Damage</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{['Date','Branch','Product','Qty','Reason','Cost','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {damages.map(d=>(
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{d.date}</td>
                <td className="px-4 py-3 text-gray-800">{branches.find(b=>b.id===d.branchId)?.name}</td>
                <td className="px-4 py-3 text-gray-800">{products.find(p=>p.id===d.productId)?.description}</td>
                <td className="px-4 py-3 text-gray-600">{d.quantity}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{d.reason}</span></td>
                <td className="px-4 py-3 font-semibold text-red-600">${d.cost} ر.س</td>
                <td className="px-4 py-3"><button onClick={()=>deleteDamage(d.id)} className="text-red-500 hover:underline text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Record Damaged/Waste</h2>
            <div><label className="text-xs font-medium text-gray-600">Branch</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}>
                <option value="">Select</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Product</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}>
                <option value="">Select</option>{products.map(p=><option key={p.id} value={p.id}>{p.description}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Date</label><input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-600">Reason</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value as DamageRecord['reason']})}>
                {REASONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Quantity</label><input type="number" min={1} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.quantity} onChange={e=>setForm({...form,quantity:+e.target.value})}/></div>
              <div><label className="text-xs font-medium text-gray-600">Cost ($)</label><input type="number" min={0} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.cost} onChange={e=>setForm({...form,cost:+e.target.value})}/></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Damaged Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Damaged / Waste Analytics"
        onExport={doExport}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Total Records" value={damages.length} color="blue" icon="📋" />
          <KpiCard title="Total Cost" value={totalCost.toLocaleString()+' ر.س'} color="red" icon="💸" />
          <KpiCard title="Damage" value={damages.filter(d=>d.reason==='Damage').length} color="orange" icon="🔴" />
          <KpiCard title="Expiry" value={damages.filter(d=>d.reason==='Expiry').length} color="gray" icon="⏰" />
        </div>

        {/* By Reason */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">📊 By Reason</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {REASONS.map(reason => {
              const reasonDamages = damages.filter(d=>d.reason===reason)
              const cost = reasonDamages.reduce((s,d)=>s+d.cost,0)
              return (
                <div key={reason} className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-medium text-red-700 opacity-70 mb-1">{reason}</p>
                  <p className="text-xl font-bold text-red-700">{reasonDamages.length}</p>
                  <p className="text-xs text-red-500 mt-1">{cost.toLocaleString()} ر.س</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* By Branch */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">🏢 By Branch</h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Branch','Records','Total Cost (ر.س)'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {branches.map(b=>{
                  const bd = damages.filter(d=>d.branchId===b.id)
                  if(bd.length===0) return null
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{b.name}</td>
                      <td className="px-3 py-2 text-center font-semibold text-blue-700">{bd.length}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-700">{bd.reduce((s,d)=>s+d.cost,0).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </AnalyticsModal>
    </div>
  )
}








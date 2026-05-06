import { useState } from 'react'
import { exportToExcel } from '../utils/exportExcel'
import { useInventoryStore } from '../store/useInventoryStore'
import type { StockTake } from '../types'

export default function StockTake() {
  const { branches, products, stocks, stockTakes, addStockTake } = useInventoryStore()
  const doExport = () => exportToExcel(stockTakes.flatMap(st=>st.items.map(i=>({Date:st.date,Branch:branches.find(b=>b.id===st.branchId)?.name,Product:products.find(p=>p.id===i.productId)?.description,'System Qty':i.systemQty,'Actual Qty':i.actualQty,Variance:i.actualQty-i.systemQty,'Variance%':i.systemQty?((i.actualQty-i.systemQty)/i.systemQty*100).toFixed(1)+'%':'0%',Status:st.status}))), 'StockTake')
  const [branchId, setBranchId] = useState('')
  const [items, setItems] = useState<{productId:string;systemQty:number;actualQty:number}[]>([])
  const [saved, setSaved] = useState(false)

  const startCount = () => {
    if (!branchId) return
    const branchStocks = stocks.filter(s=>s.branchId===branchId)
    setItems(branchStocks.map(s=>({productId:s.productId,systemQty:s.quantity,actualQty:s.quantity})))
    setSaved(false)
  }

  const submit = () => {
    if (!branchId||!items.length) return
    const st: Omit<StockTake,'id'> = { branchId, date: new Date().toISOString().slice(0,10), status:'Completed', items }
    addStockTake(st)
    setSaved(true)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Stock Take</h1><p className="text-sm text-gray-500">{stockTakes.length} sessions recorded</p></div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">New Stock Count</h2>
        <div className="flex gap-3">
          <select className="border rounded-lg px-3 py-2 text-sm flex-1" value={branchId} onChange={e=>setBranchId(e.target.value)}>
            <option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={startCount} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Load Products</button>
        </div>
        {items.length>0 && (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>{['Product','System Qty','Actual Qty','Variance','%'].map(h=><th key={h} className="px-3 py-2 text-left text-xs text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {items.map((item,i)=>{
                  const p=products.find(pr=>pr.id===item.productId)
                  const diff=item.actualQty-item.systemQty
                  const pct=item.systemQty?(diff/item.systemQty*100).toFixed(1):'0'
                  return (
                    <tr key={item.productId} className={diff<0?'bg-red-50':diff>0?'bg-green-50':''}>
                      <td className="px-3 py-2 font-medium text-gray-800">{p?.description}</td>
                      <td className="px-3 py-2 text-gray-600">{item.systemQty}</td>
                      <td className="px-3 py-2"><input type="number" className="w-20 border rounded px-2 py-1 text-sm" value={item.actualQty} onChange={e=>{const n=[...items];n[i]={...n[i],actualQty:+e.target.value};setItems(n)}}/></td>
                      <td className={`px-3 py-2 font-semibold ${diff<0?'text-red-600':diff>0?'text-green-600':'text-gray-500'}`}>{diff>0?'+':''}{diff}</td>
                      <td className={`px-3 py-2 text-xs ${diff<0?'text-red-500':diff>0?'text-green-500':'text-gray-400'}`}>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {saved ? <p className="text-green-600 font-medium text-sm">Stock take saved successfully!</p> : <button onClick={submit} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Submit Count</button>}
          </>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between"><h2 className="font-semibold text-gray-700">History</h2><button onClick={doExport} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Export Excel</button></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{['Date','Branch','Items','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {stockTakes.map(st=>(
              <tr key={st.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{st.date}</td>
                <td className="px-4 py-3 text-gray-800">{branches.find(b=>b.id===st.branchId)?.name}</td>
                <td className="px-4 py-3 text-gray-600">{st.items.length}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.status==='Completed'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{st.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}





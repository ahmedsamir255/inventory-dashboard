import { useMemo } from 'react'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useInventoryStore } from '../store/useInventoryStore'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const { branches, products, stocks, damages, stockTakes } = useInventoryStore()
  const fmt = (n: number) => n.toLocaleString('en-US',{maximumFractionDigits:0}) + ' ر.س'

  const totalStockValue = useMemo(() => stocks.reduce((s,st)=>{ const p=products.find(pr=>pr.id===st.productId); return s+(p?p.unitCost*p.qty:0) },0),[stocks,products])
  const totalDamage = useMemo(() => damages.reduce((s,d)=>s+d.cost,0),[damages])
  const totalResults = useMemo(() => branches.reduce((a,b)=>a+(b.inventoryValue??0),0),[branches])
  const avgVar = useMemo(()=>{ const all=stockTakes.flatMap(st=>st.items); if(!all.length) return 0; const tv=all.reduce((s,i)=>s+Math.abs(i.actualQty-i.systemQty),0); const ts=all.reduce((s,i)=>s+i.systemQty,0); return ts?(tv/ts)*100:0 },[stockTakes])

  // Best results = least negative (closest to 0), sorted descending
  const resultsData = useMemo(()=>branches
    .filter(b=>(b.inventoryValue??0) !== 0)
    .map(b=>({ name: b.name.length>18 ? b.name.slice(0,18)+'...' : b.name, results: b.inventoryValue??0 }))
    .sort((a,b)=>a.results-b.results)
    .slice(0,10)
  ,[branches])

  const classSummary = useMemo(()=>{
    const map: Record<string,number> = {}
    branches.forEach(b=>{ const c=b.branchClass??'A'; map[c]=(map[c]??0)+(b.inventoryValue??0) })
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
  },[branches])

  const topBranches = useMemo(()=>[...branches].sort((a,b)=>(b.inventoryValue??0)-(a.inventoryValue??0)),[branches])
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(),'EEEE, MMMM d yyyy')} · {branches.length} branches</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Inventory Results" value={fmt(totalResults)} icon="📋" color="green" sub={`${branches.filter(b=>(b.inventoryValue??0)!==0).length} branches`}/>
        <StatCard title="Total Stock Value" value={fmt(totalStockValue)} icon="🏭" color="blue" sub={`${stocks.length} lines`}/>
        <StatCard title="Damage / Waste" value={fmt(totalDamage)} icon="⚠️" color="red" sub={`${damages.length} records`}/>
        <StatCard title="Total Products" value={String(products.length)} icon="📦" color="gray" sub="In catalog"/>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Worst Inventory Results — Top 10</h2>
          <p className="text-xs text-gray-400 mb-3">Most negative = worst performance</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={resultsData} layout="vertical" margin={{left:30,right:10}}>
              <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`${(Number(v)/1000).toFixed(0)}k`} reversed={true}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={130} orientation="right" yAxisId={0}/>
              <Tooltip formatter={(v)=>`${Number(v).toLocaleString('en-US')} ر.س`}/>
              <Bar dataKey="results" radius={[0,4,4,0]} name="Results">
                {resultsData.map((entry,i)=><Cell key={i} fill={entry.results>=0?'#10b981':'#ef4444'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Results by Class</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={classSummary}>
              <XAxis dataKey="name" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(Number(v)/1000).toFixed(0)}k`}/>
              <Tooltip formatter={(v)=>`${Number(v).toLocaleString('en-US')} ر.س`}/>
              <Bar dataKey="value" radius={[4,4,0,0]} name="Results">
                {classSummary.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Stock Variance</h2>
          <div className="text-center py-6">
            <p className="text-5xl font-bold text-orange-500">{avgVar.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-2">Average variance rate</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Best Results</h2>
          <ul className="space-y-3">{topBranches.slice(0,5).map((b,i)=>(
            <li key={b.id} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i===0?'bg-yellow-400':i===1?'bg-gray-400':'bg-orange-400'}`}>{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                <p className="text-xs text-gray-400">{b.lastInventory||''}</p>
              </div>
              <span className="text-sm font-semibold text-green-600 whitespace-nowrap">{fmt(b.inventoryValue??0)}</span>
            </li>
          ))}</ul>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Worst Results</h2>
          <ul className="space-y-3">{[...topBranches].reverse().slice(0,5).map((b,i)=>(
            <li key={b.id} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 text-red-600 flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                <p className="text-xs text-gray-400">{b.lastInventory||''}</p>
              </div>
              <span className="text-sm font-semibold text-red-500 whitespace-nowrap">{fmt(b.inventoryValue??0)}</span>
            </li>
          ))}</ul>
        </div>
      </div>
    </div>
  )
}



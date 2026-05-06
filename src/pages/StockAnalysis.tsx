import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { useInventoryStore } from '../store/useInventoryStore'
import { exportToExcel } from '../utils/exportExcel'

export default function StockAnalysis() {
  const { branches } = useInventoryStore()

  const stockRows = branches
    .map(b => ({ id: b.id, branchCode: b.branchCode||'', branchName: b.name, stockValue: b.stockValue??0 }))
    .sort((a,b) => a.branchName.localeCompare(b.branchName))

  const totalStockValue = stockRows.reduce((sum,r) => sum + r.stockValue, 0)

  const doExport = () => exportToExcel(stockRows.map(r=>({'Branch Code':r.branchCode,'Branch Name':r.branchName,'Stock Value':r.stockValue})),'Stock Analysis')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-red-600 rounded inline-block"/>Stock Analysis
        </h2>
        <button onClick={doExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">↓ Export Excel</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-500">Total Branches</p>
          <p className="text-xl font-bold text-gray-800">{stockRows.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-500">Branches with Stock</p>
          <p className="text-xl font-bold text-blue-700">{stockRows.filter(r=>r.stockValue>0).length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-500">Total Stock Value</p>
          <p className="text-xl font-bold text-red-600">{totalStockValue.toLocaleString()} ر.س</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-500">Avg per Branch</p>
          <p className="text-xl font-bold text-green-600">{stockRows.length>0?Math.round(totalStockValue/stockRows.length).toLocaleString():0} ر.س</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><span className="w-2 h-5 bg-red-600 rounded inline-block"/>Stock Value by Branch</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...stockRows].filter(r=>r.stockValue>0).sort((a,b)=>b.stockValue-a.stockValue).slice(0,15)} layout="vertical" margin={{left:10,right:20}}>
                <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>Number(v).toLocaleString()}/>
                <YAxis type="category" dataKey="branchName" width={110} tick={{fontSize:10}}/>
                <Tooltip formatter={(v:unknown)=>[Number(v).toLocaleString()+' ر.س','Stock Value']}/>
                <Bar dataKey="stockValue" name="Stock Value" fill="#DC2626" radius={[0,4,4,0]} maxBarSize={18}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><span className="w-2 h-5 bg-red-600 rounded inline-block"/>Stock Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockRows.filter(r=>r.stockValue>0).sort((a,b)=>b.stockValue-a.stockValue).slice(0,10)} dataKey="stockValue" nameKey="branchName" cx="50%" cy="50%" outerRadius={90} label={({name,percent})=>`${name} ${((percent??0)*100).toFixed(0)}%`} labelLine={false}>
                  {stockRows.filter(r=>r.stockValue>0).slice(0,10).map((_r,i)=>(<Cell key={i} fill={['#DC2626','#EF4444','#F87171','#991B1B','#7F1D1D','#B91C1C','#FCA5A5','#FEE2E2','#450A0A','#C0392B'][i%10]}/>))}
                </Pie>
                <Tooltip formatter={(v:unknown)=>Number(v).toLocaleString()+' ر.س'}/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

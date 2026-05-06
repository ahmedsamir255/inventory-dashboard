import { useState, useEffect, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import AnalyticsModal from '../components/AnalyticsModal'
import KpiCard from '../components/KpiCard'

const API = 'http://localhost:3005'
const PAGE_SIZE = 100

interface Product { id: string; sku: string; barcode: string; description: string; qty: number; unitCost: number; salesPrice: number }
type ProductForm = Omit<Product, 'id'>
const emptyForm = (): ProductForm => ({ sku: '', barcode: '', description: '', qty: 0, unitCost: 0, salesPrice: 0 })

export default function Products() {
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<{total:number,zeroCost:number,zeroQty:number,oneQty:number,totalQty:number,totalValue:number,categories:{cat:string,count:number,totalQty:number,totalValue:number}[],top10:{sku:string,description:string,qty:number,unitCost:number,value:number}[]} | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchProducts = useCallback(async (p: number, s: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/products?page=${p}&limit=${PAGE_SIZE}&search=${encodeURIComponent(s)}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch(_e) { setItems([]) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts(page, search) }, [page, fetchProducts])

  const fetchAnalytics = async () => {
    setShowAnalytics(true)
    try {
      const r = await fetch(API + '/api/products/analytics')
      setAnalytics(await r.json())
    } catch { setAnalytics(null) }
  }

  const handleSearch = (val: string) => {
    setSearch(val); setPage(1)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchProducts(1, val), 400)
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setOpen(true) }
  const openEdit = (p: Product) => { setEditing(p); setForm({ sku:p.sku, barcode:p.barcode, description:p.description, qty:p.qty, unitCost:p.unitCost, salesPrice:p.salesPrice }); setOpen(true) }

  const save = async () => {
    if (!form.description.trim() && !form.sku.trim()) return
    if (editing) await fetch(`${API}/api/products/${editing.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    else await fetch(`${API}/api/products`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    setOpen(false); fetchProducts(page, search)
  }

  const del = async (id: string) => {
    if (!window.confirm('Delete this product?')) return
    await fetch(`${API}/api/products/${id}`, { method:'DELETE' })
    fetchProducts(page, search)
  }

  const clearAll = async () => {
    if (!window.confirm('Delete ALL ' + total.toLocaleString() + ' products?')) return
    await fetch(`${API}/api/products`, { method:'DELETE' })
    setPage(1); fetchProducts(1, search)
  }

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true); setImportProgress('Reading file...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type:'array' })
        const rows: Record<string,unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' })
        const fv = (v: unknown) => v ? String(v) : ''
        const bulk = rows.map(row => ({
          sku: fv(row['No'] ?? row['SKU'] ?? row['sku']),
          barcode: fv(row['Barcode No'] ?? row['Barcode'] ?? row['barcode']),
          description: fv(row['Description'] ?? row['description'] ?? row['Discrabtion']),
          qty: Number(row['Qty'] ?? row['qty'] ?? 0),
          unitCost: Number(row['Unit Cost'] ?? row['unite cost'] ?? 0),
          salesPrice: Number(row['Sales Price'] ?? row['Sales price'] ?? 0),
        })).filter(r => r.sku || r.description)

        const CHUNK = 2000
        const chunks = Math.ceil(bulk.length / CHUNK)
        for (let i = 0; i < chunks; i++) {
          const slice = bulk.slice(i*CHUNK, (i+1)*CHUNK)
          setImportProgress('Importing ' + Math.min((i+1)*CHUNK, bulk.length).toLocaleString() + ' / ' + bulk.length.toLocaleString() + '...')
          await fetch(`${API}/api/bulk-products`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ products:slice }) })
        }
        setImportProgress('Done! ' + bulk.length.toLocaleString() + ' products imported.')
        setTimeout(() => { setImporting(false); setImportProgress(''); setPage(1); fetchProducts(1,'') }, 2000)
      } catch(err) {
        setImportProgress('Error: ' + String(err))
        setTimeout(() => { setImporting(false); setImportProgress('') }, 3000)
      }
      e.target.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  const exportExcel = async () => {
    setImportProgress('Preparing export...')
    const res = await fetch(`${API}/api/products?page=1&limit=200000&search=`)
    const data = await res.json()
    const rows = (data.items||[]).map((p: Product, i: number) => ({'#':i+1,'No':p.sku,'Barcode No':p.barcode,'Description':p.description,'Qty':p.qty,'Unit Cost':p.unitCost,'Total Price':p.qty*p.unitCost,'Sales Price':p.salesPrice}))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, 'Products.xlsx')
    setImportProgress('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} products total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-56" placeholder="Search SKU / Barcode / Description..." value={search} onChange={e=>handleSearch(e.target.value)}/>
          <button onClick={async()=>{if(confirm("Clear ALL products? This cannot be undone.")){try{await fetch(`${API}/api/products/clear`,{method:"DELETE"});setItems([]);setTotal(0);setTotalPages(1);setPage(1);alert("All products cleared")}catch(e){alert("Error clearing products")}}}} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">Clear All</button>
          <button onClick={exportExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Export Excel</button>
          <button onClick={()=>fileRef.current?.click()} disabled={importing} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50">{importing?'Importing...':'Import Excel'}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importExcel}/>
          <button onClick={fetchAnalytics} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800">📊 Analytics</button>
          <button onClick={clearAll} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-900">Clear All</button>
          <button onClick={openAdd} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800">+ Add Product</button>
        </div>
      </div>

      {importProgress&&<div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 font-medium">{importProgress}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['#','SKU','BARCODE','DESCRIPTION','QTY','UNIT COST','TOTAL PRICE','SALES PRICE',''].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading&&<tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>}
            {!loading&&items.length===0&&<tr><td colSpan={9} className="text-center py-8 text-gray-400">No products found</td></tr>}
            {!loading&&items.map((p,i)=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400 text-xs">{(page-1)*PAGE_SIZE+i+1}</td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">{p.sku||'—'}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.barcode||'—'}</td>
                <td className="px-4 py-2.5 text-gray-800">{p.description}</td>
                <td className="px-4 py-2.5 text-center font-semibold">{p.qty.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{p.unitCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ر.س</td>
                <td className="px-4 py-2.5 text-right font-semibold text-green-700">{(p.qty*p.unitCost).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ر.س</td>
                <td className="px-4 py-2.5 text-right text-blue-700 font-semibold">{p.salesPrice.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ر.س</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <button onClick={()=>openEdit(p)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                  <button onClick={()=>del(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1&&(
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">Showing {((page-1)*PAGE_SIZE+1).toLocaleString()}–{Math.min(page*PAGE_SIZE,total).toLocaleString()} of {total.toLocaleString()}</span>
            <div className="flex items-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(1)} className="px-2 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-100">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100">Prev</button>
              <span className="px-3 py-1.5 text-sm font-semibold text-gray-700">{page} / {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100">Next</button>
              <button disabled={page===totalPages} onClick={()=>setPage(totalPages)} className="px-2 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-100">»</button>
            </div>
          </div>
        )}
      </div>

      {open&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing?'Edit Product':'Add Product'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-600 uppercase">SKU (No)</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Barcode</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></div>
              <div className="col-span-2"><label className="text-xs font-semibold text-gray-600 uppercase">Description</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Qty</label><input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.qty} onChange={e=>setForm({...form,qty:+e.target.value})}/></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Unit Cost</label><input type="number" step="0.01" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.unitCost} onChange={e=>setForm({...form,unitCost:+e.target.value})}/></div>
              <div><label className="text-xs font-semibold text-gray-600 uppercase">Sales Price</label><input type="number" step="0.01" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.salesPrice} onChange={e=>setForm({...form,salesPrice:+e.target.value})}/></div>
              <div className="flex items-end"><div className="bg-green-50 rounded-lg px-3 py-2 w-full"><p className="text-xs text-gray-400">Total Price</p><p className="text-sm font-bold text-green-700">{(form.qty*form.unitCost).toLocaleString('en-US',{minimumFractionDigits:2})} ر.س</p></div></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-red-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Products Analytics"
        onExport={() => {
          if (!analytics) return
          const rows = analytics.categories.map(c=>({'Category':c.cat,'Product Count':c.count,'Total Qty':c.totalQty,'Total Value (ر.س)':c.totalValue.toFixed(2)}))
          const ws = XLSX.utils.json_to_sheet(rows)
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Categories')
          const ws2 = XLSX.utils.json_to_sheet(analytics.top10.map((p,i)=>({'#':i+1,'SKU':p.sku,'Description':p.description,'Qty':p.qty,'Unit Cost':p.unitCost,'Value':p.value})))
          XLSX.utils.book_append_sheet(wb,ws2,'Top 10')
          XLSX.writeFile(wb,'Products_Analytics.xlsx')
        }}
      >
        {!analytics ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard title="Total Products" value={analytics.total.toLocaleString()} color="blue" />
              <KpiCard title="Total Qty" value={analytics.totalQty.toLocaleString()} color="green" />
              <KpiCard title="Total Value" value={analytics.totalValue.toLocaleString('en-US',{maximumFractionDigits:0})+' ر.س'} color="purple" />
              <KpiCard title="Zero Cost" value={analytics.zeroCost.toLocaleString()} color="red" />
              <KpiCard title="Zero Qty" value={analytics.zeroQty.toLocaleString()} color="orange" />
              <KpiCard title="Qty = 1" value={analytics.oneQty.toLocaleString()} color="gray" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categories Table */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">📦 By Category (Top 20)</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{['Category','Count','Total Qty','Value (ر.س)'].map(h=><th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.categories.map((c,i)=>(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono font-semibold text-blue-700">{c.cat}</td>
                          <td className="px-3 py-1.5 text-center">{c.count.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-center">{c.totalQty.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-green-700">{c.totalValue.toLocaleString('en-US',{maximumFractionDigits:0})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top 10 by Value */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">🏆 Top 10 by Value</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{['#','SKU','Description','Qty','Value'].map(h=><th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.top10.map((p,i)=>(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-400 font-bold">{i+1}</td>
                          <td className="px-3 py-1.5 font-mono text-blue-700">{p.sku}</td>
                          <td className="px-3 py-1.5 text-gray-700 max-w-[120px] truncate">{p.description}</td>
                          <td className="px-3 py-1.5 text-center">{(p.qty||0).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">{p.value.toLocaleString('en-US',{maximumFractionDigits:0})} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Quick filters info */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-500 font-medium">🔴 Zero Cost Products</p>
                    <p className="text-xl font-bold text-red-700">{analytics.zeroCost.toLocaleString()}</p>
                    <p className="text-xs text-red-400">{((analytics.zeroCost/analytics.total)*100).toFixed(1)}% of total</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-orange-500 font-medium">🟠 Zero Qty Products</p>
                    <p className="text-xl font-bold text-orange-700">{analytics.zeroQty.toLocaleString()}</p>
                    <p className="text-xs text-orange-400">{((analytics.zeroQty/analytics.total)*100).toFixed(1)}% of total</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnalyticsModal>
    </div>
  )
}
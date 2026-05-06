import { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useInventoryStore } from '../store/useInventoryStore'
import { exportToExcel } from '../utils/exportExcel'
import type { Branch } from '../types'
import AnalyticsModal from '../components/AnalyticsModal'
import KpiCard from '../components/KpiCard'

const CLASSES: Branch['branchClass'][] = ['Al Fursan','A','B','C','D']
const classColor = (c: string) => c==='Al Fursan'?'bg-yellow-100 text-yellow-800 border-yellow-300':c==='A'?'bg-green-100 text-green-700 border-green-300':c==='B'?'bg-blue-100 text-blue-700 border-blue-300':c==='C'?'bg-orange-100 text-orange-700 border-orange-300':'bg-red-100 text-red-700 border-red-300'
const typeColor = (t?: string) => t==='Warehouse'?'bg-amber-100 text-amber-700 border-amber-300':t==='Office'?'bg-sky-100 text-sky-700 border-sky-300':t==='Damage'?'bg-red-100 text-red-700 border-red-300':'bg-indigo-100 text-indigo-700 border-indigo-300'

const emptyForm = (): Omit<Branch,'id'> => ({
  branchCode:'', name:'', area:'', areaManager:'', branchClass:'A', branchType:'Branch', manager:'', email:'', country:'',
  lastInventory: new Date().toISOString().slice(0,10), inventoryValue:0, notes:'',
  mobile:'', workingHours:'',
  location:'', managerId:'', deputyId:'', status:'Active', createdAt: new Date().toISOString().slice(0,10)
})

export default function Branches() {
  const { branches, stocks, products, addBranch, updateBranch, deleteBranch } = useInventoryStore()
  const clearAll = () => { if (window.confirm(`Delete all ${branches.length} branches? This cannot be undone.`)) branches.forEach(b => deleteBranch(b.id)) }
  const [form, setForm] = useState<Omit<Branch,'id'>>(emptyForm())
  const [editing, setEditing] = useState<Branch|null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'cards'|'report'>('cards')
  const [importing, setImporting] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsFilter, setAnalyticsFilter] = useState<'All' | 'Branch' | 'Warehouse'>('All')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.area??'').toLowerCase().includes(search.toLowerCase()) ||
    (b.branchCode??'').toLowerCase().includes(search.toLowerCase())
  )

  const sortedBranches = useMemo(() => {
    if (!sortConfig) return filtered
    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortConfig.key) {
        case 'code': aVal = a.branchCode; bVal = b.branchCode; break
        case 'name': aVal = a.name; bVal = b.name; break
        case 'area': aVal = a.area; bVal = b.area; break
        case 'class': aVal = a.branchClass; bVal = b.branchClass; break
        case 'manager': aVal = a.manager; bVal = b.manager; break
        default: return 0
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortConfig])

  const getStockValue = (branchId: string) =>
    stocks.filter(s => s.branchId === branchId).reduce((acc, s) => {
      const p = products.find(pr => pr.id === s.productId)
      return acc + (p ? p.unitCost * s.quantity : 0)
    }, 0)

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setOpen(true) }
  const openEdit = (b: Branch) => {
    setEditing(b)
    setForm({ branchCode:b.branchCode??'', name:b.name, area:b.area??'', areaManager:b.areaManager??'',
      branchClass:b.branchClass??'A', branchType:b.branchType??'Branch', manager:b.manager, email:b.email??'',
      lastInventory:b.lastInventory??'', inventoryValue:b.inventoryValue??0, notes:b.notes??'', country:b.country??'',
      mobile:b.mobile??'', workingHours:b.workingHours??'',
      location:b.location, managerId:b.managerId??'', deputyId:b.deputyId??'',
      status:b.status, createdAt:b.createdAt })
    setOpen(true)
  }

  const save = () => {
    if (!form.name.trim()) return
    if (editing) updateBranch({ ...form, id: editing.id })
    else addBranch(form)
    setOpen(false)
  }

  const branchFileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['AREA','B. Code','Branch Name','Class','Area Manager','Branch Manager','Mobile Number','EMAIL','WORKING HOURS','Location'],
      ['Riyadh','001','Example Branch','A','Ahmed Manager','Ali Hassan','0501234567','branch@email.com','9AM-10PM','Riyadh Mall']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Branches')
    XLSX.writeFile(wb, 'Branches_Template.xlsx')
  }

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!window.confirm('⚠️ سيتم مسح جميع الفروع الموجودة واستبدالها بالجديدة.\n\nهل أنت متأكد؟')) {
      e.target.value = ''
      return
    }

    setImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:3005/api/import/branches', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.error || 'Import failed')
      }

      // Refresh from server
      await useInventoryStore.getState().fetchBranches?.()

      console.log('Import successful:', data.imported, 'of', data.total)

    } catch (err) {
      console.log('Import failed:', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const doExport = () => exportToExcel(filtered.map((b, i) => ({
    '#': i + 1,
    'Area': b.area ?? '',
    'Branch Code': b.branchCode ?? '',
    'Branch Name': b.name,
    'Class': b.branchClass ?? '',
    'Area Manager': b.areaManager ?? '',
    'Branch Manager': b.manager ?? '',
    'Mobile Number': b.mobile ?? '',
    'Branch Email': b.email ?? '',
    'Working Hours': b.workingHours ?? '',
    'Location': b.location ?? '',
    'Country': b.country ?? '',
    'Notes': b.notes ?? '',
    'Last Inventory': b.lastInventory ?? '',
    'Results (ر.س)': b.inventoryValue ?? 0,
    'Stock Value': b.stockValue ?? getStockValue(b.id),
  })), 'Branches')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Branch Management</h1>
          <p className="text-sm text-gray-500">{branches.length} branches</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <button onClick={downloadTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Download Template</button>
          <button onClick={doExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Export Excel</button>
          <button onClick={()=>setShowAnalytics(true)} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800">📊 Analytics</button>
          <button onClick={()=>branchFileRef.current?.click()} disabled={importing} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed">{importing ? '⏳ Importing...' : 'Import Excel'}</button>
          <input ref={branchFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importExcel}/>
          <button onClick={clearAll} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-black flex items-center gap-1.5">🗑 Clear All</button>
          <button onClick={openAdd} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800">+ Add Branch</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button onClick={()=>setTab('cards')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab==='cards'?'border-red-600 text-red-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>Cards View</button>
        <button onClick={()=>setTab('report')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab==='report'?'border-red-600 text-red-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>Report</button>
      </div>

      {/* Cards View */}
      {tab === 'cards' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(b => {
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-red-700 to-red-800 px-4 py-3 flex items-start justify-between">
                  <div>
                    <p className="text-xs text-red-300 font-mono">{b.branchCode||''}</p>
                    <p className="text-sm font-bold text-white leading-tight">{b.name}</p>
                    <p className="text-xs text-red-200">{b.area||''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {b.branchType === 'Branch' && b.branchClass && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${classColor(b.branchClass??'A')}`}>{b.branchClass}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${typeColor(b.branchType)}`}>{b.branchType??'Branch'}</span>
                  </div>
                </div>
                <div className="px-4 py-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Branch Manager</span><span className="text-xs font-medium text-gray-800">{b.manager||'—'}</span></div>
                  {b.areaManager && <div className="flex justify-between"><span className="text-xs text-gray-400">Area Manager</span><span className="text-xs font-medium text-gray-800">{b.areaManager}</span></div>}
                  {(b as any).mobile && <div className="flex justify-between"><span className="text-xs text-gray-400">Mobile</span><span className="text-xs text-gray-700">{(b as any).mobile}</span></div>}
                  {b.email && <div className="flex justify-between"><span className="text-xs text-gray-400">Email</span><span className="text-xs text-gray-500 truncate max-w-[140px]">{b.email}</span></div>}
                </div>
                <div className="flex gap-2 border-t px-4 py-2">
                  <button onClick={() => openEdit(b)} className="flex-1 text-center text-xs text-blue-600 hover:underline font-medium">Edit</button>
                  <button onClick={() => deleteBranch(b.id)} className="flex-1 text-center text-xs text-red-500 hover:underline font-medium">Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Report Table */}
      {tab === 'report' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">#</th>
                <th onClick={() => setSortConfig({ key: 'area', direction: sortConfig?.key === 'area' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap cursor-pointer hover:bg-gray-100">
                  AREA {sortConfig?.key === 'area' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => setSortConfig({ key: 'code', direction: sortConfig?.key === 'code' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap cursor-pointer hover:bg-gray-100">
                  B. Code {sortConfig?.key === 'code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => setSortConfig({ key: 'name', direction: sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap cursor-pointer hover:bg-gray-100">
                  Branch Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => setSortConfig({ key: 'class', direction: sortConfig?.key === 'class' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap cursor-pointer hover:bg-gray-100">
                  Class {sortConfig?.key === 'class' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">Area Manager</th>
                <th onClick={() => setSortConfig({ key: 'manager', direction: sortConfig?.key === 'manager' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap cursor-pointer hover:bg-gray-100">
                  Branch Manager {sortConfig?.key === 'manager' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">Mobile Number</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">EMAIL</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">WORKING HOURS</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">Location</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600 whitespace-nowrap">Notes</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-orange-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.map((b, i) => (
                <tr key={b.id} className={`border-b hover:bg-gray-50 ${i%2===0?'bg-white':'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{i+1}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{b.area||'—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.branchCode || '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{b.name}</td>
                  <td className="px-3 py-2">{b.branchType === 'Branch' && b.branchClass && (<span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${classColor(b.branchClass??'A')}`}>{b.branchClass}</span>)}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{b.areaManager||'—'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{b.manager||'—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{(b as any).mobile||'—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{b.email||'—'}</td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{(b as any).workingHours||'—'}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{b.location||'—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-xs truncate">{b.notes||'—'}</td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <button onClick={() => openEdit(b)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                    <button onClick={() => deleteBranch(b.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {sortedBranches.length === 0 && (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">No branches found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

            {/* Modal - same fields as table columns */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">{editing ? 'Edit Branch' : 'Add Branch'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Branch Code</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.branchCode??''} onChange={e=>setForm({...form,branchCode:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Branch Name</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.name} onChange={e=>{const n=e.target.value;const l=n.toLowerCase();let branchType:Branch['branchType']='Branch';if(l.includes('تالف')||l.includes('damage'))branchType='Damage';else if(l.includes('مستودع')||l.includes('مخزن')||l.includes('warehouse'))branchType='Warehouse';else if(l.includes('مكتب')||l.includes('office'))branchType='Office';setForm({...form,name:n,branchType});}}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Area</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.area} onChange={e=>setForm({...form,area:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Area Manager</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.areaManager??''} onChange={e=>setForm({...form,areaManager:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Class</label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.branchClass} onChange={e=>setForm({...form,branchClass:e.target.value as Branch['branchClass']})}>
                  {CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Type</label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.branchType??'Branch'} onChange={e=>setForm({...form,branchType:e.target.value as Branch['branchType']})}>
                  <option value="Branch">Branch</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Office">Office</option>
                  <option value="Damage">Damage</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Manager</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.manager??''} onChange={e=>setForm({...form,manager:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Country</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.country??''} onChange={e=>setForm({...form,country:e.target.value})}/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase">Branch Email</label>
                <input type="email" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="branch@email.com" value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Mobile Number</label>
                <input type="tel" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="05XXXXXXXX" value={form.mobile??''} onChange={e=>setForm({...form,mobile:e.target.value})}/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Working Hours</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="e.g. 9AM–10PM" value={form.workingHours??''} onChange={e=>setForm({...form,workingHours:e.target.value})}/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase">Location (Google Maps Link)</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="https://maps.google.com/..." value={form.location??''} onChange={e=>setForm({...form,location:e.target.value})}/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase">Notes</label>
                <textarea rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" value={form.notes??''} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>
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
        onClose={() => { setShowAnalytics(false); setAnalyticsFilter('All') }}
        title="Branches Analytics"
        onExport={doExport}
      >
        {/* Type filter tabs */}
        <div className="flex gap-1 border-b mb-5">
          {(['All','Branch','Warehouse'] as const).map(f => (
            <button key={f} onClick={() => setAnalyticsFilter(f)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${analyticsFilter===f?'border-purple-600 text-purple-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>{f==='All'?'All Types':f+'s'}</button>
          ))}
        </div>

        {/* KPI Cards */}
        {(() => {
          const analyticsBranches = analyticsFilter === 'All' ? branches : branches.filter(b => (b.branchType ?? 'Branch') === analyticsFilter)
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KpiCard title={analyticsFilter === 'All' ? 'Total Branches' : `Total ${analyticsFilter}s`} value={analyticsBranches.length} color="blue" icon="🏢" />
                <KpiCard title="Active" value={analyticsBranches.filter(b=>b.status==='Active').length} color="green" icon="✅" />
                <KpiCard title="Areas" value={[...new Set(analyticsBranches.map(b=>b.area).filter(Boolean))].length} color="purple" icon="🗺️" />
                <KpiCard title="Total Stock Value" value={analyticsBranches.reduce((s,b)=>s+(b.stockValue??getStockValue(b.id)),0).toLocaleString()+' ر.س'} color="orange" icon="💰" />
              </div>

              {/* By Type breakdown (only in All tab) */}
              {analyticsFilter === 'All' && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">🏷️ Breakdown by Type</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Branch','Warehouse','Office'] as const).map(t => {
                      const count = branches.filter(b=>(b.branchType??'Branch')===t).length
                      return (
                        <div key={t} className={`rounded-xl border-2 p-3 text-center ${typeColor(t)}`}>
                          <p className="text-xs font-medium opacity-70 mb-1">{t}</p>
                          <p className="text-2xl font-bold">{count}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* By Class */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3">🏷️ By Class</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['Al Fursan','A','B','C','D'] as Branch['branchClass'][]).map(cls => {
                    const count = analyticsBranches.filter(b=>b.branchClass===cls).length
                    return (
                      <div key={cls} className={`rounded-xl border-2 p-3 text-center ${classColor(cls)}`}>
                        <p className="text-xs font-medium opacity-70 mb-1">{cls}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* By Area */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">📍 By Area</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Area','Count','Stock Value (ر.س)'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...new Set(analyticsBranches.map(b=>b.area||'Unknown'))].sort().map(area=>{
                        const areaBranches = analyticsBranches.filter(b=>(b.area||'Unknown')===area)
                        const areaStock = areaBranches.reduce((s,b)=>s+(b.stockValue??getStockValue(b.id)),0)
                        return (
                          <tr key={area} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-700">{area}</td>
                            <td className="px-3 py-2 text-center font-semibold text-blue-700">{areaBranches.length}</td>
                            <td className="px-3 py-2 text-right font-semibold text-green-700">{areaStock.toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        })()}
      </AnalyticsModal>
    </div>
  )
}




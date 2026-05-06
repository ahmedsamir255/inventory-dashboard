import { useState, useRef, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import * as XLSX from 'xlsx'
import { exportToExcel } from '../utils/exportExcel'
import { useInventoryStore } from '../store/useInventoryStore'
import type { InventorySchedule, InventoryType, Inventory2025, Inv2026Item } from '../types'
import { INVENTORY_TYPES } from '../types'
import AnalyticsModal from '../components/AnalyticsModal'
import KpiCard from '../components/KpiCard'
import Results2025Analysis from './Results2025Analysis'

function getDaysDiff(from: string, to: string) { if (!from||!to) return 0; return Math.abs(Math.round((new Date(to).getTime()-new Date(from).getTime())/86400000)) }
function getDayName(dateStr: string) { if (!dateStr) return ''; const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; return days[new Date(dateStr).getDay()] }

const EMPTY: Omit<InventorySchedule,'id'> = { inventoryType:'Full Count',from:'',to:'',branchId:'',region:'',team:'',inOut:'IN',results:0,totalSales2026:0,lastInventoryResult:0,lastInventory:'',teamLeader:'',notes:'' }
const EMPTY25: Omit<Inventory2025,'id'> = { branchId:'',year:2025,months:{Jan:0,Feb:0,Mar:0,Apr:0,May:0,Jun:0,Jul:0,Aug:0,Sep:0,Oct:0,Nov:0,Dec:0},total:0,notes:'' }

export default function Inventory() {
  const { branches,updateBranch,schedules,addSchedule,updateSchedule,deleteSchedule,clearAllSchedules,inv2025,addInv2025,updateInv2025,deleteInv2025,inv2026Items,deleteInv2026ItemsByBranch,updateInv2026Item } = useInventoryStore()
  const [tab,setTab] = useState<'stock'|'schedule'|'inv2025'|'inv2026'>('stock')
  const [branchFilter,setBranchFilter] = useState('all')
  const [selectedBranch26,setSelectedBranch26] = useState<string|null>(null)
  const [showAnalytics,setShowAnalytics] = useState(false)
  const [show2025Analysis,setShow2025Analysis] = useState(false)

  const [showAdd26Modal,setShowAdd26Modal] = useState(false)
  const [add26Form,setAdd26Form] = useState({inventoryType:'Full Count' as InventoryType, date:'', area:'', branchId:'', notes:'', file:null as File|null})
  const add26FileRef = useRef<HTMLInputElement>(null)
  const [edit26Item, setEdit26Item] = useState<Inv2026Item|null>(null)
  const [edit26Form, setEdit26Form] = useState({cat:'',description:'',systemQty:0,physQty:0,varianceQty:0,varianceValue:0})
  const scheduleImportRef = useRef<HTMLInputElement>(null)
  const stockImportRef = useRef<HTMLInputElement>(null)

  const [showModal,setShowModal] = useState(false)
  const [editRec,setEditRec] = useState<InventorySchedule|null>(null)
  const [form,setForm] = useState<Omit<InventorySchedule,'id'>>(EMPTY)

  const [showI25Modal,setShowI25Modal] = useState(false)
  const [editI25,setEditI25] = useState<Inventory2025|null>(null)
  const [form25,setForm25] = useState<Omit<Inventory2025,'id'>>(EMPTY25)
  const [schedView, setSchedView] = useState<'cards'|'table'>('cards')
  const [schedStatusFilter, setSchedStatusFilter] = useState<'all'|'done'|'inprogress'|'scheduled'|'pending'>('all')
  const [schedRegionFilter, setSchedRegionFilter] = useState('all')
  const [schedBranchFilter, setSchedBranchFilter] = useState('all')
  const inv2025ImportRef = useRef<HTMLInputElement>(null)

  // Stock inline edit state
  const [editStockId, setEditStockId] = useState<string|null>(null)
  const [editStockValue, setEditStockValue] = useState('')

  // Stock rows - group by branch, sum stockValue
  const stockRows = useMemo(() => {
    return branches
      .filter(b => branchFilter==='all' || b.id===branchFilter)
      .map(b => ({ id: b.id, branchCode: b.branchCode||'', branchName: b.name, stockValue: b.stockValue||0 }))
      .sort((a,b2) => a.branchName.localeCompare(b2.branchName))
  }, [branches, branchFilter])

  const saveEditStock = () => {
    if(!editStockId) return
    const b = branches.find(x=>x.id===editStockId)
    if(b) updateBranch({...b, stockValue: Number(editStockValue)||0})
    setEditStockId(null)
  }
  const deleteStockRow = (id: string) => {
    if(!window.confirm('Clear stock value for this branch')) return
    const b = branches.find(x=>x.id===id)
    if(b) updateBranch({...b, stockValue: 0})
  }

  const doExport = () => exportToExcel(stockRows.map(r=>({'Branch Code':r.branchCode,'Branch Name':r.branchName,'Stock Value':r.stockValue})),'Stock')

  const importStockExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0]; if(!file) return
    
    // Create status panel
    const panel = document.createElement('div')
    panel.id = 'import-panel'
    panel.style.cssText = 'position:fixed;top:10px;right:10px;left:10px;bottom:10px;background:white;border:2px solid #DC2626;border-radius:12px;z-index:9999;padding:20px;overflow:auto;font-size:13px;box-shadow:0 20px 50px rgba(0,0,0,0.3);'
    panel.innerHTML = '<h3 style="color:#DC2626;margin:0 0 15px 0;"> Reading Excel File...</h3>'
    document.body.appendChild(panel)
    
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result as ArrayBuffer),{type:'array'})
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, {defval:''}) as Record<string,unknown>[]
        
        if(rows.length===0){
          panel.innerHTML = '<h3 style="color:red;"> No data found</h3><button onclick="document.getElementById(\'import-panel\').remove()" style="padding:10px 20px;background:#DC2626;color:white;border:none;border-radius:6px;">Close</button>'
          return
        }
        
        // Get actual column names
        const firstRow = rows[0]
        const cols = Object.keys(firstRow)
        
        // Helper to find column value by partial name match
        const findVal = (row: Record<string,unknown>, keywords: string[]) => {
          for(const key of Object.keys(row)){
            const lowerKey = key.toLowerCase().replace(/[._\s]/g,'')
            for(const kw of keywords){
              if(lowerKey.includes(kw.toLowerCase().replace(/[._\s]/g,''))){
                return row[key]
              }
            }
          }
          return ''
        }
        
        let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <h3 style="color:#DC2626;margin:0;"> Import Results</h3>
          <button onclick="document.getElementById('import-panel').remove()" style="padding:8px 16px;background:#DC2626;color:white;border:none;border-radius:6px;cursor:pointer;"> Close</button>
        </div>
        <div style="background:#f3f4f6;padding:10px;border-radius:8px;margin-bottom:15px;">
          <b>Found:</b> ${rows.length} rows | <b>Columns:</b> ${cols.join(', ')}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#DC2626;color:white;">
              <th style="padding:8px;border:1px solid #ddd;">#</th>
              <th style="padding:8px;border:1px solid #ddd;">Code Found</th>
              <th style="padding:8px;border:1px solid #ddd;">Name Found</th>
              <th style="padding:8px;border:1px solid #ddd;">Value</th>
              <th style="padding:8px;border:1px solid #ddd;">Matched Branch</th>
              <th style="padding:8px;border:1px solid #ddd;">Status</th>
            </tr>
          </thead>
          <tbody>`
        
        let updated = 0
        
        rows.forEach((row, idx) => {
          // Extract values using flexible matching
          const codeVal = findVal(row, ['code','','b.code','bcode','branchcode'])
          const nameVal = findVal(row, ['name','branch','','b.name','bname','branchname'])
          const stockVal = findVal(row, ['value','stock','','','stockvalue'])
          
          const code = String(codeVal).trim()
          const name = String(nameVal).trim()
          const val = Number(String(stockVal).replace(/,/g,'')) || 0
          
          // Try to match
          let matchedBranch = null
          for(const b of branches){
            const bc = String(b.branchCode||'').toLowerCase().trim()
            const bn = String(b.name).toLowerCase().trim()
            
            if(code && bc && (bc===code.toLowerCase() || bc.includes(code.toLowerCase()) || code.toLowerCase().includes(bc))){
              matchedBranch = b; break
            }
            if(name && bn && (bn===name.toLowerCase() || bn.includes(name.toLowerCase()) || name.toLowerCase().includes(bn))){
              matchedBranch = b; break
            }
          }
          
          const status = matchedBranch ? 
            `<span style="color:green;font-weight:bold;"> Updated</span>` : 
            `<span style="color:red;font-weight:bold;"> Not Found</span>`
          
          const matchedName = matchedBranch ? matchedBranch.name : 'X'
          
          if(matchedBranch){
            updateBranch({...matchedBranch, stockValue: val})
            updated++
          }
          
          // Only show first 50 rows in preview
          if(idx < 50){
            html += `
            <tr style="${idx%2===0 ? 'background:#f9fafb' : ''}">
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${idx+1}</td>
              <td style="padding:6px;border:1px solid #ddd;">${code||'X'}</td>
              <td style="padding:6px;border:1px solid #ddd;">${name||'X'}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right;">${val.toLocaleString()}</td>
              <td style="padding:6px;border:1px solid #ddd;">${matchedName}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:center;">${status}</td>
            </tr>`
          }
        })
        
        if(rows.length > 50){
          html += `<tr><td colspan="6" style="padding:10px;text-align:center;color:#666;">... and ${rows.length-50} more rows</td></tr>`
        }
        
        html += `</tbody></table>
        <div style="margin-top:15px;padding:15px;background:${updated>0 ? '#d1fae5' : '#fee2e2'};border-radius:8px;">
          <b style="font-size:16px;">${updated > 0 ? ` Successfully updated ${updated} branches` : ' No branches matched'}</b>
        </div>`
        
        panel.innerHTML = html
        
      } catch(err) {
        panel.innerHTML = `<h3 style="color:red;"> Error: ${err}</h3><button onclick="document.getElementById('import-panel').remove()" style="padding:10px 20px;background:#DC2626;color:white;border:none;border-radius:6px;">Close</button>`
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value=''
  }

  const openAdd = () => { setEditRec(null);setForm(EMPTY);setShowModal(true) }
  const openEdit = (s:InventorySchedule) => { setEditRec(s);setForm({...s});setShowModal(true) }
  const save = () => { if(editRec)updateSchedule({...form,id:editRec.id});else addSchedule(form);setShowModal(false) }

  const openAddI25 = () => { setEditI25(null);setForm25(EMPTY25);setShowI25Modal(true) }
  const openEditI25 = (i:Inventory2025) => { setEditI25(i);setForm25({...i});setShowI25Modal(true) }
  const saveI25 = () => { if(editI25)updateInv2025({...form25,id:editI25.id});else addInv2025(form25);setShowI25Modal(false) }

  // Schedule Excel Import
  const importScheduleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0]; if(!file) return
    
    const panel = document.createElement('div')
    panel.id = 'sch-import-panel'
    panel.style.cssText = 'position:fixed;top:10px;right:10px;left:10px;bottom:10px;background:white;border:2px solid #DC2626;border-radius:12px;z-index:9999;padding:20px;overflow:auto;font-size:13px;box-shadow:0 20px 50px rgba(0,0,0,0.3);'
    panel.innerHTML = '<h3 style="color:#DC2626;margin:0 0 15px 0;"> Reading Schedule File...</h3>'
    document.body.appendChild(panel)
    
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result as ArrayBuffer), {type:'array', cellDates:true})
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, {defval:'', raw:false}) as Record<string,unknown>[]
        
        if(rows.length===0){
          panel.innerHTML = '<h3 style="color:red;"> No data found</h3><button onclick="document.getElementById(\'sch-import-panel\').remove()" style="padding:10px 20px;background:#DC2626;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>'
          return
        }
        
        const cols = Object.keys(rows[0])
        
        // Flexible column finder
        const findVal = (row: Record<string,unknown>, keywords: string[]) => {
          for(const key of Object.keys(row)){
            const lk = key.toLowerCase().replace(/[\s._\-\/]/g,'')
            for(const kw of keywords){
              const lkw = kw.toLowerCase().replace(/[\s._\-\/]/g,'')
              if(lk===lkw || lk.includes(lkw) || lkw.includes(lk)){
                return row[key]
              }
            }
          }
          return ''
        }
        
        // Parse date - handles string "2026-01-15" or "15/01/2026" or "Jan 15, 2026"
        const parseDate = (v: unknown): string => {
          if(!v) return ''
          const s = String(v).trim()
          if(!s) return ''
          // Already ISO format
          if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10)
          // DD/MM/YYYY
          const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
          if(dm) {
            const yr = dm[3].length===2 ? '20'+dm[3] : dm[3]
            return `${yr}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`
          }
          // Try native Date parse
          const d = new Date(s)
          if(!isNaN(d.getTime())) return d.toISOString().substring(0,10)
          return s
        }
        
        let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <h3 style="color:#DC2626;margin:0;"> Schedule Import Preview</h3>
          <button onclick="document.getElementById('sch-import-panel').remove()" style="padding:8px 16px;background:#DC2626;color:white;border:none;border-radius:6px;cursor:pointer;"> Close</button>
        </div>
        <div style="background:#f3f4f6;padding:10px;border-radius:8px;margin-bottom:15px;">
          <b>Found:</b> ${rows.length} rows &nbsp;|&nbsp; <b>Columns in file:</b> ${cols.join(' | ')}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#DC2626;color:white;">
              <th style="padding:6px;border:1px solid #ddd;">#</th>
              <th style="padding:6px;border:1px solid #ddd;">Type</th>
              <th style="padding:6px;border:1px solid #ddd;">From</th>
              <th style="padding:6px;border:1px solid #ddd;">To</th>
              <th style="padding:6px;border:1px solid #ddd;">Branch (in file)</th>
              <th style="padding:6px;border:1px solid #ddd;">Matched Branch</th>
              <th style="padding:6px;border:1px solid #ddd;">Region</th>
              <th style="padding:6px;border:1px solid #ddd;">Notes</th>
              <th style="padding:6px;border:1px solid #ddd;">Status</th>
            </tr>
          </thead><tbody>`
        
        let imported = 0
        const newSchedules: Omit<InventorySchedule,'id'>[] = []
        
        rows.forEach((row, idx) => {
          const typeVal = String(findVal(row, ['type','','inventorytype','inv type'])||'Full Count').trim()
          const fromRaw = findVal(row, ['from','','start','startdate','fromdate','date from',' '])
          const toRaw   = findVal(row, ['to','','end','enddate','todate','date to',' '])
          const branchRaw = String(findVal(row, ['branch','','branchname','branch name',' '])||'').trim()
          const regionRaw = String(findVal(row, ['region','','area',''])||'').trim()
          const notesRaw  = String(findVal(row, ['notes','','note','comment'])||'').trim()
          
          const fromDate = parseDate(fromRaw)
          const toDate   = parseDate(toRaw)
          
          // Match branch
          const matchedBranch = branches.find(b => {
            const bn = b.name.toLowerCase().trim()
            const bc = (b.branchCode||'').toLowerCase().trim()
            const rn = branchRaw.toLowerCase()
            if(!rn) return false
            return bn===rn || bc===rn || bn.includes(rn) || rn.includes(bn) || bc.includes(rn) || rn.includes(bc)
          })
          
          const sched: Omit<InventorySchedule,'id'> = {
            inventoryType: typeVal as InventoryType,
            from: fromDate,
            to: toDate,
            branchId: matchedBranch.id||'',
            region: matchedBranch.area||regionRaw,
            team: '',
            inOut: 'IN',
            results: 0,
            totalSales2026: 0,
            lastInventoryResult: 0,
            lastInventory: '',
            teamLeader: '',
            notes: notesRaw,
          }
          newSchedules.push(sched)
          imported++
          
          const status = matchedBranch ? 
            `<span style="color:green;font-weight:bold;"></span>` : 
            (branchRaw ? `<span style="color:orange;"> No Match</span>` : `<span style="color:gray;">X No Branch</span>`)
          
          if(idx < 60){
            html += `<tr style="${idx%2===0 ? 'background:#f9fafb' : ''}">
              <td style="padding:5px;border:1px solid #eee;text-align:center;">${idx+1}</td>
              <td style="padding:5px;border:1px solid #eee;">${typeVal}</td>
              <td style="padding:5px;border:1px solid #eee;font-family:monospace;">${fromDate||'X'}</td>
              <td style="padding:5px;border:1px solid #eee;font-family:monospace;">${toDate||'X'}</td>
              <td style="padding:5px;border:1px solid #eee;">${branchRaw||'X'}</td>
              <td style="padding:5px;border:1px solid #eee;font-weight:bold;">${matchedBranch.name||'X'}</td>
              <td style="padding:5px;border:1px solid #eee;">${matchedBranch.area||regionRaw||'X'}</td>
              <td style="padding:5px;border:1px solid #eee;max-width:120px;overflow:hidden;">${notesRaw||'X'}</td>
              <td style="padding:5px;border:1px solid #eee;text-align:center;">${status}</td>
            </tr>`
          }
        })
        
        if(rows.length > 60){
          html += `<tr><td colspan="9" style="padding:10px;text-align:center;color:#888;">... ${rows.length-60} more rows</td></tr>`
        }
        
        html += `</tbody></table>
        <div style="margin-top:15px;display:flex;gap:10px;align-items:center;">
          <button id="confirm-import-btn" style="padding:12px 30px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;"> Confirm Import (${imported} records)</button>
          <button onclick="document.getElementById('sch-import-panel').remove()" style="padding:12px 20px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;"> Cancel</button>
        </div>`
        
        panel.innerHTML = html
        
        // Confirm button saves all records
        document.getElementById('confirm-import-btn').addEventListener('click', () => {
          newSchedules.forEach(s => addSchedule(s))
          document.getElementById('sch-import-panel').remove()
          console.log('Import successful:', imported, 'schedule records')
        })
        
      } catch(err) {
        panel.innerHTML = `<h3 style="color:red;"> Error reading file: ${String(err)}</h3><button onclick="document.getElementById('sch-import-panel').remove()" style="padding:10px 20px;background:#DC2626;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>`
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value=''
  }

  const importInv2025Excel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0]; if(!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('http://localhost:3005/api/import/inv2025-excel', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Import failed')
      await useInventoryStore.getState().loadFromServer()
      console.log('Import successful:', data.imported, 'of', data.total)
    } catch(err) {
      console.error('Import failed:', err instanceof Error ? err.message : 'Unknown error')
    }
    e.target.value=''
  }

  // Inv2026 import
  const importInv2026Excel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`http://localhost:3005/api/import/inv2026-excel?branchId=${encodeURIComponent(add26Form.branchId)}`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Import failed')
      await useInventoryStore.getState().loadFromServer()
      console.log('[Import 2026] Saved:', data.imported, 'of', data.total)
    } catch (err) {
      console.error('Import error:', err)
    } finally {
      e.target.value = ''
    }
  }

  // Total stock value
  const totalStockValue = useMemo(()=>branches.reduce((s,b)=>s+(b.stockValue||0),0),[branches])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['stock','schedule','inv2025','inv2026'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-semibold ${tab===t ? 'border-b-2 border-red-600 text-red-600':'text-gray-500'}`}>
            {t==='stock' ?'Stock':t==='schedule' ?'Schedule':t==='inv2025' ?'Results 2025':'Results 2026'}
          </button>
        ))}
      </div>
      {/* ----- Stock Tab ----- */}
      {tab==='stock'&&(
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            <input ref={stockImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importStockExcel}/>
            <button onClick={()=>stockImportRef.current.click()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1"> Import Excel</button>
            <button onClick={doExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"> Export Excel</button>
            <button onClick={()=>{if(window.confirm('Clear all Stock Values')){branches.forEach(b=>updateBranch({...b,stockValue:0}))}}} className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-semibold">Clear All</button>
            <button onClick={()=>{
              const wb = XLSX.utils.book_new()
              const ws = XLSX.utils.aoa_to_sheet([['Branch Code','Branch Name','Stock Value'],['101','Branch Name','100000']])
              XLSX.utils.book_append_sheet(wb, ws, 'Stock')
              XLSX.writeFile(wb, 'Stock_Template.xlsx')
            }} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold"> Download Template</button>
            <select className="border rounded-lg px-3 py-2 text-sm ml-auto" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Summary card */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Branches</p>
              <p className="text-2xl font-bold text-gray-800">{stockRows.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Stock Value</p>
              <p className="text-2xl font-bold text-blue-700">{totalStockValue.toLocaleString()} ر.س</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Avg Stock Value / Branch</p>
              <p className="text-2xl font-bold text-gray-700">{stockRows.length?Math.round(totalStockValue/stockRows.length).toLocaleString():0} ر.س</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Branch Code</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Branch Name</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Stock Value (.)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map(r=>(
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-red-700 bg-red-50 w-24">{r.branchCode||'X'}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{r.branchName}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">
                      {editStockId===r.id ? (
                        <input
                          type="number"
                          value={editStockValue}
                          onChange={e=>setEditStockValue(e.target.value)}
                          className="w-28 px-2 py-1 border rounded text-right text-sm"
                          autoFocus
                          onKeyDown={e=>{e.key==='Enter'&&saveEditStock()}}
                        />
                      ) : (
                        r.stockValue.toLocaleString()
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editStockId===r.id ? (
                        <button onClick={saveEditStock} className="text-green-600 hover:text-green-800 text-xs font-bold px-1">Save</button>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button onClick={()=>{setEditStockId(r.id);setEditStockValue(String(r.stockValue))}} className="text-blue-600 hover:text-blue-800" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={()=>deleteStockRow(r.id)} className="text-red-600 hover:text-red-800" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----- Schedule Tab ----- */}
      {tab==='schedule'&&(
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={openAdd} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">+ Add Schedule</button>
            <input ref={scheduleImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importScheduleExcel}/>
            <button onClick={()=>scheduleImportRef.current.click()} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold"> Import Excel</button>
            <button onClick={()=>{
              const wb = XLSX.utils.book_new()
              const ws = XLSX.utils.aoa_to_sheet([
                ['Type','From','To','Branch','Region','Notes'],
                ['Full Count','2026-01-15','2026-01-20','Branch Name','Central',' '],
                ['Cycle Count','2026-02-01','2026-02-03','Branch Name','West',' '],
                ['Batches','2026-03-10','2026-03-10','Branch Name','East',''],
              ])
              ws['!cols']=[{wch:18},{wch:14},{wch:14},{wch:30},{wch:20},{wch:30}]
              XLSX.utils.book_append_sheet(wb,ws,'Schedule 2026')
              XLSX.writeFile(wb,'Schedule_2026_Template.xlsx')
            }} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold"> Template</button>
            <button onClick={()=>{
              const ws = XLSX.utils.json_to_sheet(schedules.map(s=>{
                const b=branches.find(x=>x.id===s.branchId)
                return {'Type':s.inventoryType,'From':s.from,'To':s.to,'No of Days':getDaysDiff(s.from,s.to)||'','Branch':b.name||s.branchId,'Region':s.region||b.area||'','Notes':s.notes||''}
              }))
              const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Schedule 2026')
              XLSX.writeFile(wb,'Schedule_2026_Export.xlsx')
            }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"> Export</button>
            <button onClick={()=>{if(confirm('Clear ALL schedules'))clearAllSchedules()}} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold">Clear All</button>
            {/* View Toggle */}
            <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['cards','table'] as const).map(v=>(
                <button key={v} onClick={()=>setSchedView(v)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${schedView===v ? 'bg-white shadow text-red-600':'text-gray-500'}`}>
                  {v==='cards' ? ' Cards':' Table'}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">{schedules.length} records</span>
          </div>

          {/* Region + Branch Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={schedRegionFilter} onChange={e=>{setSchedRegionFilter(e.target.value);setSchedBranchFilter('all')}}>
              <option value="all">All Regions</option>
              {[...new Set(schedules.map(s=>s.region||branches.find(b=>b.id===s.branchId).area||'').filter(Boolean))].sort().map(r=>(
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={schedBranchFilter} onChange={e=>setSchedBranchFilter(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.filter(b=>schedRegionFilter==='all'||(b.area===schedRegionFilter)).map(b=>(
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={()=>setShowAnalytics(true)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white">
               Analytics
            </button>
            {(schedRegionFilter!=='all'||schedBranchFilter!=='all')&&(
              <button onClick={()=>{setSchedRegionFilter('all');setSchedBranchFilter('all')}} className="px-3 py-2 border border-gray-300 text-gray-500 rounded-lg text-sm"> Clear Filters</button>
            )}
          </div>

          {/* Status Filter Buttons */}
          {(()=>{
            const today = new Date().toISOString().substring(0,10)
            const getStatus = (s: InventorySchedule) => {
              const n = (s.notes||'').toLowerCase()
              if(n.includes('') || n.includes('') || n.includes('done') || n.includes('completed') || n.includes('finished')) return 'done'
              if(n.includes('') || n.includes('') || n.includes('progress') || n.includes('ongoing')) return 'inprogress'
              if(s.from && s.from <= today && (!s.to || s.to >= today)) return 'inprogress'
              if(s.from && s.from > today) return 'scheduled'
              return 'pending'
            }
            const counts = {all:schedules.length, done:schedules.filter(s=>getStatus(s)==='done').length, inprogress:schedules.filter(s=>getStatus(s)==='inprogress').length, scheduled:schedules.filter(s=>getStatus(s)==='scheduled').length, pending:schedules.filter(s=>getStatus(s)==='pending').length}
            const filtered = schedules.filter(s=>{
              if(schedStatusFilter!=='all'&&getStatus(s)!==schedStatusFilter) return false
              if(schedRegionFilter!=='all'&&(s.region||branches.find(b=>b.id===s.branchId).area||'')!==schedRegionFilter) return false
              if(schedBranchFilter!=='all'&&s.branchId!==schedBranchFilter) return false
              return true
            })
            return (
              <>
                {/* Status Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    {key:'all',label:'All',count:counts.all,color:'bg-gray-700',icon:''},
                    {key:'done',label:'Completed',count:counts.done,color:'bg-green-600',icon:''},
                    {key:'inprogress',label:'In Progress',count:counts.inprogress,color:'bg-orange-500',icon:''},
                    {key:'scheduled',label:'Scheduled',count:counts.scheduled,color:'bg-blue-600',icon:''},
                    {key:'pending',label:'Not Started',count:counts.pending,color:'bg-gray-400',icon:''},
                  ].map(st=>(
                    <button key={st.key} onClick={()=>setSchedStatusFilter(st.key as any)}
                      className={`${st.color} text-white rounded-xl p-3 text-left shadow transition-all hover:opacity-90 ${schedStatusFilter===st.key ? 'ring-2 ring-offset-2 ring-gray-400 scale-105':''}`}>
                      <div className="flex justify-between items-start">
                        <span className="text-lg">{st.icon}</span>
                        <span className="text-2xl font-extrabold">{st.count}</span>
                      </div>
                      <p className="text-xs opacity-80 mt-1 font-semibold">{st.label}</p>
                    </button>
                  ))}
                </div>

                {/* CARDS VIEW */}
                {schedView==='cards'&&(
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.length===0&&(
                      <div className="col-span-4 text-center py-16 text-gray-400">
                        <p className="text-4xl mb-3"></p>
                        <p>No schedules in this category</p>
                      </div>
                    )}
                    {filtered.sort((a,b)=>(a.from||'').localeCompare(b.from||'')).map(s=>{
                      const branch = branches.find(b=>b.id===s.branchId)
                      const nDays = getDaysDiff(s.from,s.to)
                      const status = getStatus(s)
                      const today = new Date().toISOString().substring(0,10)
                      const isOverdue = s.to && s.to < today && status!=='done'
                      const statusConfig = {
                        done:     {label:'Completed',    bg:'bg-green-100',  border:'border-green-500',  badge:'bg-green-500',  bar:'bg-green-500'},
                        inprogress:{label:'In Progress', bg:'bg-orange-50',  border:'border-orange-400', badge:'bg-orange-400', bar:'bg-orange-400'},
                        scheduled:{label:'Scheduled',    bg:'bg-blue-50',    border:'border-blue-400',   badge:'bg-blue-500',   bar:'bg-blue-500'},
                        pending:  {label:'Not Started',  bg:'bg-gray-50',    border:'border-gray-300',   badge:'bg-gray-400',   bar:'bg-gray-300'},
                      }
                      const cfg = statusConfig[status]
                      return (
                        <div key={s.id} className={`relative overflow-hidden rounded-2xl border-l-4 ${cfg.border} ${cfg.bg} shadow-sm hover:shadow-md transition-all`}>
                          <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">{branch.name||'X'}</p>
                                <p className="text-xs text-gray-400">{branch.branchCode||''} {s.region||branch.area ? `X ${s.region||branch.area}`:''}</p>
                              </div>
                              <span className={`ml-2 flex-shrink-0 text-white text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                            </div>
                            {/* Type Badge */}
                            <span className="inline-block text-xs px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600 font-medium mb-3">{s.inventoryType}</span>
                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="bg-white rounded-lg p-2 border border-gray-100">
                                <p className="text-gray-400 mb-0.5">From</p>
                                <p className="font-bold text-gray-700">{s.from||'X'}</p>
                                <p className="text-indigo-500 font-medium">{getDayName(s.from)}</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-gray-100">
                                <p className="text-gray-400 mb-0.5">To</p>
                                <p className="font-bold text-gray-700">{s.to||'X'}</p>
                                <p className="text-indigo-500 font-medium">{getDayName(s.to)}</p>
                              </div>
                            </div>
                            {/* No of Days */}
                            {nDays&&(
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`h-1.5 flex-1 rounded-full bg-gray-200`}>
                                  <div className={`h-1.5 rounded-full ${cfg.bar}`} style={{width:'100%'}}/>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{nDays} days</span>
                              </div>
                            )}
                            {/* Notes */}
                            {s.notes&&<p className="text-xs text-gray-500 truncate mt-1 italic">{s.notes}</p>}
                            {isOverdue&&<p className="text-xs text-red-500 font-bold mt-1"> Overdue</p>}
                            {/* Actions */}
                            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                              <button onClick={()=>openEdit(s)} className="flex-1 py-1 text-xs bg-white border border-blue-200 text-blue-600 rounded-lg font-semibold hover:bg-blue-50">Edit</button>
                              <button onClick={()=>deleteSchedule(s.id)} className="flex-1 py-1 text-xs bg-white border border-red-200 text-red-500 rounded-lg font-semibold hover:bg-red-50">Del</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* TABLE VIEW */}
                {schedView==='table'&&(
                  <div className="bg-white rounded-xl border shadow-sm overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">From</th>
                          <th className="px-3 py-2 text-left">Day</th>
                          <th className="px-3 py-2 text-left">To</th>
                          <th className="px-3 py-2 text-left">Day</th>
                          <th className="px-3 py-2 text-center">Days</th>
                          <th className="px-3 py-2 text-left">Branch</th>
                          <th className="px-3 py-2 text-left">Region</th>
                          <th className="px-3 py-2 text-left">Notes</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.sort((a,b)=>(a.from||'').localeCompare(b.from||'')).map(s=>{
                          const branch=branches.find(b=>b.id===s.branchId)
                          const nDays=getDaysDiff(s.from,s.to)
                          const status=getStatus(s)
                          const statusBadge = {done:' Done',inprogress:' In Progress',scheduled:' Scheduled',pending:' Pending'}
                          const statusColor = {done:'text-green-600',inprogress:'text-orange-500',scheduled:'text-blue-600',pending:'text-gray-400'}
                          return (
                            <tr key={s.id} className="border-t hover:bg-gray-50">
                              <td className={`px-3 py-2 font-semibold text-xs whitespace-nowrap ${statusColor[status]}`}>{statusBadge[status]}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-medium">{s.inventoryType}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-mono">{s.from||'X'}</td>
                              <td className="px-3 py-2 text-indigo-600 font-semibold">{getDayName(s.from)}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-mono">{s.to||'X'}</td>
                              <td className="px-3 py-2 text-indigo-600 font-semibold">{getDayName(s.to)}</td>
                              <td className="px-3 py-2 text-center font-bold">{nDays||'X'}</td>
                              <td className="px-3 py-2 font-semibold whitespace-nowrap">{branch.name||s.branchId||'X'}</td>
                              <td className="px-3 py-2">{s.region||branch.area||'X'}</td>
                              <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{s.notes||'X'}</td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <button onClick={()=>openEdit(s)} className="text-blue-600 mr-2 font-medium">Edit</button>
                                <button onClick={()=>deleteSchedule(s.id)} className="text-red-600 font-medium">Del</button>
                              </td>
                            </tr>
                          )
                        })}
                        {filtered.length===0&&<tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">No records in this category.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )
          })()}
          {/* Schedule Analysis */}
        </div>
      )}

      {/* ----- Results 2025 Tab ----- */}
      {tab==='inv2025'&&(
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={openAddI25} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">+ Add Record</button>
            <input ref={inv2025ImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importInv2025Excel}/>
            <button onClick={()=>inv2025ImportRef.current.click()} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold"> Import Excel</button>
            <button onClick={()=>{
              const wb=XLSX.utils.book_new()
              const ws=XLSX.utils.aoa_to_sheet([
                ['Branch Code','Branch Name','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','997','Grand Total'],
                ['101','Branch Name',0,0,0,0,0,0,0,0,0,0,0,0,0,0]
              ])
              XLSX.utils.book_append_sheet(wb,ws,'Results 2025')
              XLSX.writeFile(wb,'Results_2025_Template.xlsx')
            }} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-semibold"> Template</button>
            <button onClick={()=>{
              const data=inv2025.map(i=>{
                const b=branches.find(x=>x.id===i.branchId)
                return {
                  'Branch Code':b.branchCode||'',
                  'Branch Name':b.name||i.branchId,
                  'Jan':i.months.Jan||0,'Feb':i.months.Feb||0,'Mar':i.months.Mar||0,'Apr':i.months.Apr||0,
                  'May':i.months.May||0,'Jun':i.months.Jun||0,'Jul':i.months.Jul||0,'Aug':i.months.Aug||0,
                  'Sep':i.months.Sep||0,'Oct':i.months.Oct||0,'Nov':i.months.Nov||0,'Dec':i.months.Dec||0,
                  '997':i.col997||0,
                  'Grand Total':i.total||0
                }
              })
              const ws=XLSX.utils.json_to_sheet(data)
              const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Results 2025')
              XLSX.writeFile(wb,'Results_2025_Export.xlsx')
            }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"> Export</button>
            <button onClick={()=>{if(confirm('Clear ALL 2025 results'))inv2025.forEach(i=>deleteInv2025(i.id))}} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold">Clear All</button>
            <button onClick={()=>setShowAnalytics(true)} className="px-4 py-2 rounded-lg text-sm font-semibold ml-auto bg-purple-700 text-white"> Analytics</button>
            <button onClick={() => setShow2025Analysis(true)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white"> Analysis</button>
            <span className="text-xs text-gray-400">{inv2025.length} branches</span>
          </div>

          {/* Monthly Pivot Table */}
          {(() => { const grandTotal2025 = inv2025.reduce((sum, i) => {
  const monthsTotal = Object.values(i.months || {}).reduce((a, b) => Number(a) + Number(b), 0)
  return sum + monthsTotal + (i.col997 || 0)
}, 0); return (
          <div className="bg-white rounded-xl border shadow-sm overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left sticky left-0 bg-gray-50 z-10">Branch Code</th>
                  <th className="px-2 py-2 text-left sticky left-20 bg-gray-50 z-10">Branch Name</th>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=>(
                    <th key={m} className="px-2 py-2 text-right min-w-[60px]">{m}</th>
                  ))}
                  <th className="px-2 py-2 text-right min-w-[60px] bg-yellow-50">997</th>
                  <th className="px-2 py-2 text-right font-bold bg-red-50">Grand Total</th>
                  <th className="px-2 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inv2025.map(i=>{
                  const branch=branches.find(b=>b.id===i.branchId)
                  const months=i.months||{}
                  return (
                    <tr key={i.id} className="border-t hover:bg-gray-50">
                      <td className="px-2 py-1.5 font-mono text-xs sticky left-0 bg-white">{branch.branchCode||'X'}</td>
                      <td className="px-2 py-1.5 font-semibold sticky left-20 bg-white min-w-[150px]">{branch.name||i.branchId}</td>
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=>{
                        const val = Math.round(months[m as keyof typeof months]||0)
                        return (
                          <td key={m} className={`px-2 py-1.5 text-right ${val<0 ? 'text-red-600 font-bold':'text-gray-700'}`}>
                            {val!==0 ? val.toLocaleString():'X'}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 text-right bg-yellow-50">
                        {(Math.round(i.col997||0)).toLocaleString()}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-bold bg-red-50 ${(i.total||0)<0 ? 'text-red-600':'text-gray-800'}`}>
                        {Math.round(i.total||0).toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={()=>openEditI25(i)} className="text-blue-600 mr-2">Edit</button>
                        <button onClick={()=>deleteInv2025(i.id)} className="text-red-600">Del</button>
                      </td>
                    </tr>
                  )
                })}
                {inv2025.length===0&&<tr><td colSpan={16} className="px-3 py-8 text-center text-gray-400">No data X add or import records.</td></tr>}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-right">TOTAL</td>
                  {(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const).map(m => {
                    const total = inv2025.reduce((sum, i) => sum + (Number(i.months[m]) || 0), 0)
                    return (
                      <td key={m} className={`px-2 py-2 text-right ${total < 0 ? 'text-red-600' : ''}`}>
                        {total !== 0 ? Math.round(total).toLocaleString() : 'X'}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-right bg-yellow-100">
                    {inv2025.reduce((sum, i) => sum + (i.col997 || 0), 0).toLocaleString()}
                  </td>
                  <td className={`px-2 py-2 text-right bg-red-100 ${grandTotal2025 < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {Math.round(grandTotal2025).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          ); })()}

          {/* Analysis */}
          <Results2025Analysis isOpen={show2025Analysis} onClose={() => setShow2025Analysis(false)} />
        </div>
      )}

      {/* ----- Inv2026 Tab ----- */}
      {tab==='inv2026'&&(
        <div className="space-y-4">
          {!selectedBranch26 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{inv2026Items.length>0 ? `${[...new Set(inv2026Items.map(x=>x.branchId))].length} branches with data`:'No data X add record to start'}</p>
                <div className="flex gap-2">
                  <button onClick={()=>{if(confirm('Clear ALL 2026 data')){deleteInv2026ItemsByBranch('ALL')}}} className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm">Clear All</button>
                  <button onClick={()=>setShowAdd26Modal(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">+ Add Record</button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {branches.filter(b=>inv2026Items.some(x=>x.branchId===b.id)).sort((a,b2)=>{
                  const dA=inv2026Items.filter(x=>x.branchId===a.id).map(x=>x.date).sort().reverse()[0]||""
                  const dB=inv2026Items.filter(x=>x.branchId===b2.id).map(x=>x.date).sort().reverse()[0]||""
                  return new Date(dB).getTime()-new Date(dA).getTime()
                }).map(b=>{
                  const items=inv2026Items.filter(x=>x.branchId===b.id)
                  const totalVar=items.reduce((s,i)=>s+i.varianceValue,0)
                  const shortCount=items.filter(i=>i.varianceQty<0).length
                  const overCount=items.filter(i=>i.varianceQty>0).length
                  const latestDate=items.map(i=>i.date).sort().reverse()[0]||""
                  const isShort=totalVar<0
                  return (
                    <div key={b.id} onClick={()=>setSelectedBranch26(b.id)}
                      className="relative overflow-hidden rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1 bg-white border border-gray-100">
                      <div className={`h-1.5 w-full ${isShort ? 'bg-gradient-to-r from-red-600 to-red-400':'bg-gradient-to-r from-green-500 to-green-400'}`}/>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-800 text-sm leading-tight">{b.name}</p>
                            {b.branchCode&&<span className="text-xs font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded mt-0.5 inline-block">{b.branchCode}</span>}
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow ${isShort ? 'bg-red-500':'bg-green-500'}`}>
                            {isShort ? "-" : "+"}
                          </div>
                        </div>
                        <div className={`text-xl font-extrabold mb-2 ${isShort ? 'text-red-600':'text-green-600'}`}>
                          {totalVar!==0 ? totalVar.toLocaleString()+" .":"X"}
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 border-t pt-2">
                          <span>{items.length} items</span>
                          <span className="text-red-500">{shortCount} short</span>
                          <span className="text-green-500">{overCount} over</span>
                        </div>
                        {latestDate&&<p className="text-xs text-gray-300 mt-1">{latestDate}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={()=>setSelectedBranch26(null)} className="px-3 py-1.5 text-sm text-red-600 border rounded-lg"> Back</button>
                <h2 className="font-bold">{branches.find(b=>b.id===selectedBranch26).name}</h2>
              </div>
              <div className="bg-white rounded-xl border shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th>Cat</th><th>Description</th><th>System</th><th>Phys</th><th>Var</th><th>Value</th><th>Actions</th></tr></thead>
                  <tbody>{inv2026Items.filter(x=>x.branchId===selectedBranch26).map(i=>(<tr key={i.cat} className="border-t"><td className="px-2 py-1">{i.cat}</td><td className="px-2 py-1">{i.description}</td><td className="px-2 py-1 text-center">{i.systemQty}</td><td className="px-2 py-1 text-center">{i.physQty}</td><td className={`px-2 py-1 text-center ${i.varianceQty<0 ? 'text-red-600':'text-green-600'}`}>{i.varianceQty}</td><td className="px-2 py-1 text-right">{i.varianceValue.toLocaleString()}</td><td className="px-2 py-1 whitespace-nowrap"><button onClick={()=>{setEdit26Item(i);setEdit26Form({cat:i.cat,description:i.description,systemQty:i.systemQty,physQty:i.physQty,varianceQty:i.varianceQty,varianceValue:i.varianceValue})}} className="text-blue-600 text-xs mr-2">Edit</button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----- Analysis Tab (moved to /analysis page) ----- */}

      {/* ----- Modals ----- */}
      {showModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold">{editRec ? 'Edit':'Add'} Schedule</h2><button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">X</button></div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold">Type</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.inventoryType} onChange={e=>setForm({...form,inventoryType:e.target.value as InventoryType})}>{INVENTORY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-xs font-semibold">Branch</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.branchId} onChange={e=>{const b=branches.find(x=>x.id===e.target.value);setForm({...form,branchId:e.target.value,region:b.area||form.region})}}><option value="">Select</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div><label className="text-xs font-semibold">From</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.from} onChange={e=>setForm({...form,from:e.target.value})}/></div>
              <div><label className="text-xs font-semibold">To</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.to} onChange={e=>setForm({...form,to:e.target.value})}/></div>
              <div><label className="text-xs font-semibold">Region</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/></div>
              <div><label className="text-xs font-semibold">Team</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.team} onChange={e=>setForm({...form,team:e.target.value})}/></div>
              <div><label className="text-xs font-semibold">Results</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.results} onChange={e=>setForm({...form,results:Number(e.target.value)})}/></div>
              <div><label className="text-xs font-semibold">Sales 2026</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalSales2026} onChange={e=>setForm({...form,totalSales2026:Number(e.target.value)})}/></div>
              <div><label className="text-xs font-semibold">Last Inventory Result</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lastInventoryResult} onChange={e=>setForm({...form,lastInventoryResult:Number(e.target.value)})}/></div>
              <div><label className="text-xs font-semibold">Notes</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={save} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Save</button></div>
          </div>
        </div>
      )}

      {showI25Modal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold">{editI25 ? 'Edit':'Add'} 2025 Result</h2><button onClick={()=>setShowI25Modal(false)} className="text-gray-400 text-xl">X</button></div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="text-xs font-semibold">Branch</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form25.branchId} onChange={e=>setForm25({...form25,branchId:e.target.value})}><option value="">Select</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div><label className="text-xs font-semibold">Year</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form25.year} onChange={e=>setForm25({...form25,year:Number(e.target.value)})}/></div>
              <div className="grid grid-cols-3 gap-2">
                {(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const).map(m=>(
                  <div key={m}><label className="text-xs font-semibold">{m}</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form25.months[m]} onChange={e=>{const v=Number(e.target.value);const nm={...form25.months,[m]:v};const tot=Object.values(nm).reduce((a,b)=>Number(a)+Number(b),0)+(form25.col997||0);setForm25({...form25,months:nm,total:tot})}}/></div>
                ))}
              </div>
              <div><label className="text-xs font-semibold">Total</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" value={form25.total} readOnly/></div>
              <div><label className="text-xs font-semibold">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" value={form25.notes||''} onChange={e=>setForm25({...form25,notes:e.target.value})} rows={2}/></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={()=>setShowI25Modal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={saveI25} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Save</button></div>
          </div>
        </div>
      )}

      {showAdd26Modal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold">Add Inventory 2026</h2><button onClick={()=>setShowAdd26Modal(false)} className="text-gray-400 text-xl">X</button></div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold">Type</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={add26Form.inventoryType} onChange={e=>setAdd26Form({...add26Form,inventoryType:e.target.value as InventoryType})}>{INVENTORY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div><label className="text-xs font-semibold">Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={add26Form.date} onChange={e=>setAdd26Form({...add26Form,date:e.target.value})}/></div></div>
              <div><label className="text-xs font-semibold">Area</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={add26Form.area} onChange={e=>setAdd26Form({...add26Form,area:e.target.value})}/></div>
              <div><label className="text-xs font-semibold">Branch</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={add26Form.branchId} onChange={e=>{const b=branches.find(x=>x.id===e.target.value);setAdd26Form({...add26Form,branchId:e.target.value,area:b.area||''})}}><option value="">Select Branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.branchCode ? b.branchCode+' - ':''}{b.name}</option>)}</select></div>
              <div><label className="text-xs font-semibold">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" value={add26Form.notes} onChange={e=>setAdd26Form({...add26Form,notes:e.target.value})} rows={2}/></div>
              <div><label className="text-xs font-semibold">Excel File (Cat, Description, Category, System Qty, Phys. Qty, Variance Qty, Variance - VALUE)</label><input ref={add26FileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importInv2026Excel}/><div className="flex items-center gap-2"><button onClick={()=>add26FileRef.current.click()} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">{add26Form.file ? add26Form.file.name:'Choose File'}</button></div></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={()=>setShowAdd26Modal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={()=>setShowAdd26Modal(false)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Save</button></div>
          </div>
        </div>
      )}

      {edit26Item&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between"><h2 className="text-lg font-bold">Edit Inv2026 Item</h2><button onClick={()=>setEdit26Item(null)} className="text-gray-400 text-xl">X</button></div>
            <div className="px-6 py-4 space-y-3">
              <div><label className="text-xs font-semibold">Cat</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={edit26Form.cat} onChange={e=>setEdit26Form({...edit26Form,cat:e.target.value})}/></div>
              <div><label className="text-xs font-semibold">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={edit26Form.description} onChange={e=>setEdit26Form({...edit26Form,description:e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold">System Qty</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={edit26Form.systemQty} onChange={e=>setEdit26Form({...edit26Form,systemQty:Number(e.target.value)})}/></div>
                <div><label className="text-xs font-semibold">Phys Qty</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={edit26Form.physQty} onChange={e=>setEdit26Form({...edit26Form,physQty:Number(e.target.value)})}/></div>
                <div><label className="text-xs font-semibold">Variance Qty</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={edit26Form.varianceQty} onChange={e=>setEdit26Form({...edit26Form,varianceQty:Number(e.target.value)})}/></div>
                <div><label className="text-xs font-semibold">Variance Value</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={edit26Form.varianceValue} onChange={e=>setEdit26Form({...edit26Form,varianceValue:Number(e.target.value)})}/></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={()=>setEdit26Item(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button onClick={()=>{if(edit26Item)updateInv2026Item({...edit26Item,...edit26Form});setEdit26Item(null)}} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Save</button></div>
          </div>
        </div>
      )}

      {/* Inventory Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Inventory Analytics"
      >
        {/* Schedule KPIs */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3"> Schedule Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Total Schedules" value={schedules.length} color="blue" icon="" />
            <KpiCard title="Completed" value={schedules.filter(s=>{const n=(s.notes||'').toLowerCase();return n.includes('')||n.includes('done')}).length} color="green" icon="" />
            <KpiCard title="In Progress" value={schedules.filter(s=>{const n=(s.notes||'').toLowerCase();const today=new Date().toISOString().substring(0,10);return (!n.includes('')&&!n.includes('done'))&&(n.includes('')||n.includes('progress')||(s.from&&s.from<=today&&(!s.to||s.to>=today)))}).length} color="orange" icon="" />
            <KpiCard title="2025 Records" value={inv2025.length} color="purple" icon="" />
          </div>
        </div>

        {/* 2025 Monthly Summary */}
        {inv2025.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3"> 2025 Monthly Totals</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const).map(m => {
                const total = inv2025.reduce((s,i)=>s+(i.months[m]||0),0)
                return (
                  <div key={m} className="bg-gray-50 border rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 font-medium">{m}</p>
                    <p className="text-sm font-bold text-blue-700">{total.toLocaleString()}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Schedule by region */}
        {schedules.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3"> Schedule by Region</h3>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Region','Total','Completed'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {[...new Set(schedules.map(s=>s.region||branches.find(b=>b.id===s.branchId).area||'Unknown'))].sort().map(region=>{
                    const regionSched = schedules.filter(s=>(s.region||branches.find(b=>b.id===s.branchId).area||'Unknown')===region)
                    const done = regionSched.filter(s=>{const n=(s.notes||'').toLowerCase();return n.includes('')||n.includes('done')}).length
                    return (
                      <tr key={region} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">{region}</td>
                        <td className="px-3 py-2 text-center font-semibold text-blue-700">{regionSched.length}</td>
                        <td className="px-3 py-2 text-center font-semibold text-green-700">{done}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AnalyticsModal>
    </div>
  )
}



















































import { useState } from 'react'
import { exportToExcel } from '../utils/exportExcel'
import { useInventoryStore } from '../store/useInventoryStore'
import type { Audit } from '../types'

const empty: Omit<Audit,'id'> = { branchId:'', date: new Date().toISOString().slice(0,10), inspector:'', notes:'', status:'Planned' }

export default function Audits() {
  const { branches, audits, addAudit, updateAudit, deleteAudit , clearAllAudits} = useInventoryStore()
  const doExport = () => exportToExcel(audits.map(a=>({Date:a.date,Branch:branches.find(b=>b.id===a.branchId)?.name,Inspector:a.inspector,Notes:a.notes,Status:a.status})), 'Audits')
  const [form, setForm] = useState<Omit<Audit,'id'>>(empty)
  const [editing, setEditing] = useState<Audit|null>(null)
  const [open, setOpen] = useState(false)

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (a: Audit) => { setEditing(a); setForm({branchId:a.branchId,date:a.date,inspector:a.inspector,notes:a.notes,status:a.status}); setOpen(true) }
  const save = () => {
    if (!form.branchId||!form.inspector) return
    if (editing) updateAudit({...form,id:editing.id})
    else addAudit(form)
    setOpen(false)
  }

  const statusColor = (s: string) => s==='Completed'?'bg-green-100 text-green-700':s==='In Progress'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Audit & Visits</h1><p className="text-sm text-gray-500">{audits.length} records</p></div>
        <button onClick={()=>{if(confirm("Clear ALL audits?")){clearAllAudits()}}} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">Clear All</button>
          <button onClick={doExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Export Excel</button><button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Add Visit</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{['Date','Branch','Inspector','Notes','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {audits.map(a=>(
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{a.date}</td>
                <td className="px-4 py-3 text-gray-800">{branches.find(b=>b.id===a.branchId)?.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.inspector}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.notes||'-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span></td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={()=>openEdit(a)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={()=>deleteAudit(a.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing?'Edit Audit':'Add Audit'}</h2>
            <div><label className="text-xs font-medium text-gray-600">Branch</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}>
                <option value="">Select</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Date</label><input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-600">Inspector</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.inspector} onChange={e=>setForm({...form,inspector:e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-600">Notes</label><textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm h-20" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            <div><label className="text-xs font-medium text-gray-600">Status</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e=>setForm({...form,status:e.target.value as Audit['status']})}>
                <option>Planned</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


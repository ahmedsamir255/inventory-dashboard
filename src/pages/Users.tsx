import { useState } from 'react'
import { exportToExcel } from '../utils/exportExcel'
import { useInventoryStore } from '../store/useInventoryStore'
import type { User } from '../types'
import AnalyticsModal from '../components/AnalyticsModal'
import KpiCard from '../components/KpiCard'

const ROLES: User['role'][] = ['Admin','Manager','Auditor']
const empty: Omit<User,'id'> = { name:'', email:'', role:'Auditor', status:'Active' }

export default function Users() {
  const { branches, users, addUser, updateUser, deleteUser } = useInventoryStore()
  const doExport = () => exportToExcel(users.map(u=>({Name:u.name,Email:u.email,Role:u.role,Branch:u.branchId?branches.find(b=>b.id===u.branchId)?.name:'All Branches',Status:u.status})), 'Users')
  const [form, setForm] = useState<Omit<User,'id'>>(empty)
  const [editing, setEditing] = useState<User|null>(null)
  const [open, setOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (u: User) => { setEditing(u); setForm({name:u.name,email:u.email,role:u.role,branchId:u.branchId,status:u.status}); setOpen(true) }
  const save = () => {
    if (!form.name.trim()||!form.email.trim()) return
    if (editing) updateUser({...form,id:editing.id})
    else addUser(form)
    setOpen(false)
  }

  const roleColor = (r: string) => r==='Admin'?'bg-purple-100 text-purple-700':r==='Manager'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">User Management</h1><p className="text-sm text-gray-500">{users.length} users</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={doExport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Export Excel</button>
          <button onClick={()=>setShowAnalytics(true)} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800">📊 Analytics</button>
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Add User</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>{['Name','Email','Role','Branch','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u=>(
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(u.role)}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-gray-500">{u.branchId?branches.find(b=>b.id===u.branchId)?.name:'All Branches'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status==='Active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{u.status}</span></td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={()=>openEdit(u)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={()=>deleteUser(u.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing?'Edit User':'Add User'}</h2>
            {(['name','email'] as const).map(f=>(
              <div key={f}><label className="text-xs font-medium text-gray-600 capitalize">{f}</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={(form as any)[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/></div>
            ))}
            <div><label className="text-xs font-medium text-gray-600">Role</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e=>setForm({...form,role:e.target.value as User['role']})}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Branch (optional)</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.branchId??''} onChange={e=>setForm({...form,branchId:e.target.value||undefined})}>
                <option value="">All Branches</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Status</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e=>setForm({...form,status:e.target.value as User['status']})}>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setOpen(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={save} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Users Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Users Analytics"
        onExport={doExport}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Total Users" value={users.length} color="blue" icon="👥" />
          <KpiCard title="Active" value={users.filter(u=>u.status==='Active').length} color="green" icon="✅" />
          <KpiCard title="Inactive" value={users.filter(u=>u.status==='Inactive').length} color="gray" icon="⛔" />
          <KpiCard title="Admins" value={users.filter(u=>u.role==='Admin').length} color="purple" icon="🔑" />
        </div>

        {/* By Role */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">🏷️ By Role</h3>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map(role => (
              <div key={role} className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-xs font-medium text-blue-700 opacity-70 mb-1">{role}</p>
                <p className="text-2xl font-bold text-blue-700">{users.filter(u=>u.role===role).length}</p>
              </div>
            ))}
          </div>
        </div>

        {/* User List */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">👤 All Users</h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Name','Email','Role','Branch','Status'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u=>(
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{u.name}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td className="px-3 py-2 text-gray-500">{u.branchId?branches.find(b=>b.id===u.branchId)?.name:'All'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status==='Active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{u.status}</span></td>
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


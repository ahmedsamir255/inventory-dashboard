import { create } from 'zustand'
import { format } from 'date-fns'
import { fetchState, pushState } from '../lib/api'
import type { Branch, Product, Stock, Transfer, StockTake, Audit, DamageRecord, Sale, User, InventorySchedule, Inventory2025, Inv2026Item } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

interface InventoryState {
  branches: Branch[]; products: Product[]; stocks: Stock[]; transfers: Transfer[]
  stockTakes: StockTake[]; audits: Audit[]; damages: DamageRecord[]; sales: Sale[]; users: User[]
  schedules: InventorySchedule[]
  inv2025: Inventory2025[]
  inv2026Items: Inv2026Item[]
  _loaded: boolean
  _push: () => void
  loadFromServer: () => Promise<void>
  fetchBranches: () => Promise<void>
  addBranch: (b: Omit<Branch,'id'>) => void; updateBranch: (b: Branch) => void; deleteBranch: (id: string) => void
  addProduct: (p: Omit<Product,'id'>) => void; bulkAddProducts: (ps: Omit<Product,'id'>[]) => Promise<void>; updateProduct: (p: Product) => void; deleteProduct: (id: string) => void; clearAllProducts: () => void; clearAllBranches: () => void; clearAllAudits: () => void; clearAllDamages: () => void; clearAllSales: () => void; clearAllSchedules: () => void; clearAllInv2025: () => void
  transferStock: (t: Omit<Transfer,'id'>) => void
  addStockTake: (s: Omit<StockTake,'id'>) => void
  addAudit: (a: Omit<Audit,'id'>) => void; updateAudit: (a: Audit) => void; deleteAudit: (id: string) => void
  addDamage: (d: Omit<DamageRecord,'id'>) => void; deleteDamage: (id: string) => void
  addSale: (s: Omit<Sale,'id'>) => void; updateSale: (s: Sale) => void; deleteSale: (id: string) => void
  addUser: (u: Omit<User,'id'>) => void; updateUser: (u: User) => void; deleteUser: (id: string) => void
  addSchedule: (s: Omit<InventorySchedule,'id'>) => void; updateSchedule: (s: InventorySchedule) => void; deleteSchedule: (id: string) => void
  addInv2025: (r: Omit<Inventory2025,'id'>) => void; updateInv2025: (r: Inventory2025) => void; deleteInv2025: (id: string) => void
  bulkAddInv2026Items: (branchId: string, items: Omit<Inv2026Item,'id'>[]) => void; deleteInv2026ItemsByBranch: (branchId: string) => void; updateInv2026Item: (item: Inv2026Item) => void
}

const getInventoryState = (s: InventoryState) => ({
  branches: s.branches, products: s.products, stocks: s.stocks, transfers: s.transfers,
  stockTakes: s.stockTakes, audits: s.audits, damages: s.damages, sales: s.sales, users: s.users, schedules: s.schedules, inv2025: s.inv2025, inv2026Items: s.inv2026Items,
})

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  branches: [], products: [], stocks: [], transfers: [],
  stockTakes: [], audits: [], damages: [], sales: [], users: [], schedules: [], inv2025: [],
      inv2026Items: [],
  _loaded: false,

  _push: () => {
    if (!get()._loaded) return
    const s = get()
    fetchState().then(remote => {
      pushState({ ...remote, ...getInventoryState(s) })
    }).catch(() => {
      pushState(getInventoryState(s))
    })
  },

  loadFromServer: async () => {
    try {
      const data = await fetchState()
      set({
        branches:   data.branches   ?? [],
        products:   data.products   ?? [],
        stocks:     data.stocks     ?? [],
        transfers:  data.transfers  ?? [],
        stockTakes: data.stockTakes ?? [],
        audits:     data.audits     ?? [],
        damages:    data.damages    ?? [],
        sales:      data.sales      ?? [],
        users:      data.users      ?? [],
        schedules:  data.schedules  ?? [],
        inv2025:    data.inv2025    ?? [],
        inv2026Items: data.inv2026Items ?? [],
        _loaded: true,
      })
    } catch (e) { console.warn('loadFromServer failed', e) }
  },

  addBranch: (b) => { set(s => ({ branches: [...s.branches, { ...b, id: uid() }] })); get()._push() },
  fetchBranches: async () => {
    try {
      const data = await fetchState()
      set({ branches: data.branches ?? [] })
    } catch (e) { console.warn('fetchBranches failed', e) }
  },
  updateBranch: (b) => { set(s => ({ branches: s.branches.map(x => x.id===b.id?b:x) })); get()._push() },
  deleteBranch: (id) => { set(s => ({ branches: s.branches.filter(x => x.id!==id) })); get()._push() },

  addProduct: (p) => { set(s => ({ products: [...s.products, { ...p, id: uid() }] })); get()._push() },
  bulkAddProducts: async (ps) => {
    try {
      const res = await fetch('http://localhost:3005/api/bulk-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: ps })
      })
      const data = await res.json()
      if (data.ok) {
        const withIds = ps.map(p => ({ ...p, id: uid() }))
        set(s => ({ products: [...s.products, ...withIds] }))
      }
    } catch(e) { console.error('bulk import failed', e) }
  },
  updateProduct: (p) => { set(s => ({ products: s.products.map(x => x.id===p.id?p:x) })); get()._push() },
  deleteProduct: (id) => { set(s => ({ products: s.products.filter(x => x.id!==id) })); get()._push() },
  clearAllProducts: () => { set({ products: [] }); get()._push() },
  clearAllBranches: () => { set({ branches: [] }); get()._push() },
  clearAllAudits: () => { set({ audits: [] }); get()._push() },
  clearAllDamages: () => { set({ damages: [] }); get()._push() },
  clearAllSales: () => { set({ sales: [] }); get()._push() },
  clearAllSchedules: () => { set({ schedules: [] }); get()._push() },
  clearAllInv2025: () => { set({ inv2025: [] }); get()._push() },

  updateStock: (branchId: string, productId: string, quantity: number) => {
    set(s => {
      const d = format(new Date(), 'yyyy-MM-dd')
      const exists = s.stocks.find(x => x.branchId===branchId && x.productId===productId)
      if (exists) return { stocks: s.stocks.map(x => x.branchId===branchId&&x.productId===productId?{...x,quantity,lastUpdated:d}:x) }
      return { stocks: [...s.stocks, { id:uid(), branchId, productId, quantity, lastUpdated:d }] }
    })
    get()._push()
  },

  transferStock: (t) => {
    set(s => {
      const d = format(new Date(), 'yyyy-MM-dd')
      const stocks = s.stocks.map(x => {
        if (x.branchId===t.fromBranchId && x.productId===t.productId) return {...x, quantity:Math.max(0,x.quantity-t.quantity), lastUpdated:d}
        if (x.branchId===t.toBranchId   && x.productId===t.productId) return {...x, quantity:x.quantity+t.quantity, lastUpdated:d}
        return x
      })
      if (!s.stocks.some(x => x.branchId===t.toBranchId && x.productId===t.productId))
        stocks.push({ id:uid(), branchId:t.toBranchId, productId:t.productId, quantity:t.quantity, lastUpdated:d })
      return { stocks, transfers: [...s.transfers, { ...t, id:uid() }] }
    })
    get()._push()
  },

  addStockTake: (st) => { set(s => ({ stockTakes: [...s.stockTakes, { ...st, id:uid() }] })); get()._push() },

  addAudit: (a) => { set(s => ({ audits: [...s.audits, { ...a, id:uid() }] })); get()._push() },
  updateAudit: (a) => { set(s => ({ audits: s.audits.map(x => x.id===a.id?a:x) })); get()._push() },
  deleteAudit: (id) => { set(s => ({ audits: s.audits.filter(x => x.id!==id) })); get()._push() },

  addDamage: (d) => { set(s => ({ damages: [...s.damages, { ...d, id:uid() }] })); get()._push() },
  deleteDamage: (id) => { set(s => ({ damages: s.damages.filter(x => x.id!==id) })); get()._push() },

  addSale: (sale) => { set(s => ({ sales: [...s.sales, { ...sale, id:uid() }] })); get()._push() },
  updateSale: (sale) => { set(s => ({ sales: s.sales.map(x => x.id===sale.id?sale:x) })); get()._push() },
  deleteSale: (id) => { set(s => ({ sales: s.sales.filter(x => x.id!==id) })); get()._push() },

  addUser: (u) => { set(s => ({ users: [...s.users, { ...u, id:uid() }] })); get()._push() },
  updateUser: (u) => { set(s => ({ users: s.users.map(x => x.id===u.id?u:x) })); get()._push() },
  deleteUser: (id) => { set(s => ({ users: s.users.filter(x => x.id!==id) })); get()._push() },

  addSchedule: (s) => { set(st => ({ schedules: [...st.schedules, { ...s, id:uid() }] })); get()._push() },
  updateSchedule: (s) => { set(st => ({ schedules: st.schedules.map(x => x.id===s.id?s:x) })); get()._push() },
  deleteSchedule: (id) => { set(st => ({ schedules: st.schedules.filter(x => x.id!==id) })); get()._push() },
  addInv2025: (r) => { set(st => ({ inv2025: [...st.inv2025, { ...r, id:uid() }] })); get()._push() },
  updateInv2025: (r) => { set(st => ({ inv2025: st.inv2025.map(x => x.id===r.id?r:x) })); get()._push() },
  deleteInv2025: (id) => { set(st => ({ inv2025: st.inv2025.filter(x => x.id!==id) })); get()._push() },
    bulkAddInv2026Items: (branchId, items) => { const n = items.map(i => ({...i, id: Math.random().toString(36).slice(2), branchId})); set(s => ({inv2026Items: [...s.inv2026Items.filter(x => x.branchId!==branchId), ...n]})); get()._push() },
    deleteInv2026ItemsByBranch: (branchId) => { set(s => ({inv2026Items: s.inv2026Items.filter(x => x.branchId!==branchId)})); get()._push() },
    updateInv2026Item: (item) => { set(s => ({inv2026Items: s.inv2026Items.map(x => x.id===item.id?item:x)})); get()._push() },
}))





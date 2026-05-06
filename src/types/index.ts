export interface Branch { id: string; name: string; email?: string; notes?: string; country?: string; mobile?: string; workingHours?: string; branchCode?: string; areaManager?: string; manager: string; managerId?: string; deputyId?: string; location: string; area: string; branchClass: 'Al Fursan' | 'A' | 'B' | 'C' | 'D'; branchType?: 'Branch' | 'Warehouse' | 'Office' | 'Damage'; lastInventory: string; inventoryValue: number; stockValue?: number; status: 'Active' | 'Inactive'; createdAt: string; }
export interface Product { id: string; sku: string; barcode: string; description: string; qty: number; unitCost: number; salesPrice: number; }
export interface Stock { id: string; branchId: string; productId: string; quantity: number; lastUpdated: string; }
export interface Transfer { id: string; fromBranchId: string; toBranchId: string; productId: string; quantity: number; date: string; note: string; }
export interface StockTakeItem { productId: string; systemQty: number; actualQty: number; }
export interface StockTake { id: string; branchId: string; date: string; items: StockTakeItem[]; status: 'Draft' | 'Completed'; }
export interface Audit { id: string; branchId: string; date: string; inspector: string; notes: string; status: 'Planned' | 'In Progress' | 'Completed'; }
export interface DamageRecord { id: string; branchId: string; productId: string; quantity: number; reason: 'Damage' | 'Expiry' | 'Loss'; date: string; cost: number; }
export interface Sale { id: string; branchId: string; month: string; amount: number; units: number; }
export type UserRole = 'Admin' | 'Manager' | 'Auditor';
export interface User { id: string; name: string; email: string; role: UserRole; branchId?: string; status: 'Active' | 'Inactive'; }
export const PRODUCT_CATEGORIES = ['Food & Beverage','Electronics','Clothing','Home & Garden','Health & Beauty','Stationery','Other'];
export const DAMAGE_REASONS: DamageRecord['reason'][] = ['Damage','Expiry','Loss'];
export const USER_ROLES: UserRole[] = ['Admin','Manager','Auditor'];
export const AUDIT_STATUSES: Audit['status'][] = ['Planned','In Progress','Completed'];

export type InventoryType = 'Full Count' | 'Cycle Count' | 'Batches' | 'Branch Hand Over'
export interface InventorySchedule {
  id: string
  inventoryType: InventoryType
  from: string
  to: string
  branchId: string
  branchName?: string
  region: string
  team: string
  inOut: 'IN' | 'OUT'
  results: number
  totalSales2026: number
  lastInventoryResult: number
  lastInventory: string
  teamLeader: string
  notes: string
}
export const INVENTORY_TYPES: InventoryType[] = ['Full Count','Cycle Count','Batches','Branch Hand Over']
export interface Inventory2025 {
  id: string
  branchId: string
  year: number
  months: {
    Jan: number; Feb: number; Mar: number; Apr: number; May: number; Jun: number;
    Jul: number; Aug: number; Sep: number; Oct: number; Nov: number; Dec: number;
  }
  total: number
  col997?: number
  notes?: string
}
export interface Inv2026Item {
  id: string
  branchId: string
  date: string
  cat: string
  description: string
  category: string
  systemQty: number
  physQty: number
  varianceQty: number
  costPrice: number
  varianceValue: number
}
export interface Inv2026Record {
  id: string
  branchId: string
  date: string
  inventoryType: InventoryType
  area: string
  notes: string
  items: Inv2026Item[]
}
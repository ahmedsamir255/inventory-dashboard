import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import XLSX from 'xlsx'
import { initDB, getDB } from './database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app     = express()
const PORT    = 3005

app.use(cors())
app.use(express.json({ limit: '50mb' }))

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Initialize SQLite database ────────────────────────────────────────────────
initDB()

// Always ensure admin credentials exist on every startup
try {
  const db = getDB()
  const existing = db.prepare(`SELECT * FROM authUsers WHERE username = ?`).get('ahmedsamir255')
  if (!existing) {
    db.prepare(`INSERT OR REPLACE INTO authUsers (id, username, password, name, role, status) VALUES (?,?,?,?,?,?)`)
      .run('1', 'ahmedsamir255', 'Assarr@2123', 'المدير العام', 'Admin', 'Active')
    console.log('Admin user created in SQLite')
  } else {
    db.prepare(`UPDATE authUsers SET password = ? WHERE username = ?`).run('Assarr@2123', 'ahmedsamir255')
    console.log('Admin credentials verified')
  }
} catch(e) { console.error('Auth init error:', e) }

// ── Helper: build a plain JS object from a DB row (parse JSON fields) ────────
function rowToSchedule(r) {
  return {
    id: r.id,
    inventoryType: r.inventoryType,
    from: r.fromDate,
    to: r.toDate,
    branchId: r.branchId,
    region: r.region,
    team: r.team,
    inOut: r.inOut,
    results: r.results,
    totalSales2026: r.totalSales2026,
    lastInventoryResult: r.lastInventoryResult,
    lastInventory: r.lastInventory,
    teamLeader: r.teamLeader,
    notes: r.notes,
  }
}

function rowToInv2025(r) {
  return {
    id: r.id,
    branchId: r.branchId,
    year: r.year,
    months: JSON.parse(r.months || '{}'),
    total: r.total,
    notes: r.notes,
    col997: r.col997,
  }
}

function rowToBlob(r) {
  try { return JSON.parse(r.data) } catch { return { id: r.id } }
}

// ── /api/state  (full snapshot for frontend compatibility) ────────────────────
app.get('/api/state', (_req, res) => {
  try {
    const db = getDB()
    const branches    = db.prepare('SELECT * FROM branches').all()
    const products    = db.prepare('SELECT * FROM products').all()
    const stocks      = db.prepare('SELECT * FROM stocks').all()
    const transfers   = db.prepare('SELECT * FROM transfers').all().map(rowToBlob)
    const stockTakes  = db.prepare('SELECT * FROM stockTakes').all().map(rowToBlob)
    const audits      = db.prepare('SELECT * FROM audits').all().map(rowToBlob)
    const damages     = db.prepare('SELECT * FROM damages').all().map(rowToBlob)
    const sales       = db.prepare('SELECT * FROM sales').all()
    const schedules   = db.prepare('SELECT * FROM schedules').all().map(rowToSchedule)
    const inv2025     = db.prepare('SELECT * FROM inv2025').all().map(rowToInv2025)
    const inv2026Items = db.prepare('SELECT * FROM inv2026Items').all()
    const authUsers   = db.prepare('SELECT * FROM authUsers').all()
    res.json({ branches, products, stocks, transfers, stockTakes, audits, damages, sales, schedules, inv2025, inv2026Items, users: [], authUsers })
  } catch(e) { res.status(500).json({ error: String(e) }) }
})

app.post('/api/state', (req, res) => {
  try {
    const newData = req.body
    const db = getDB()

    // Preserve authUsers – only update non-auth collections
    const collections = ['branches', 'products', 'stocks', 'sales', 'schedules', 'inv2025', 'inv2026Items', 'transfers', 'stockTakes', 'audits', 'damages']

    // Helper: upsert branches
    const upsertBranch = db.prepare(`INSERT OR REPLACE INTO branches (id,name,branchCode,branchType,area,areaManager,mobile,workingHours,location,branchClass,manager,country,email,notes,lastInventory,inventoryValue,stockValue,managerId,deputyId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const upsertProduct = db.prepare(`INSERT OR REPLACE INTO products (id,sku,barcode,name,description,category,qty,unitCost,totalPrice,salesPrice,minStock) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    const upsertStock = db.prepare(`INSERT OR REPLACE INTO stocks (id,branchId,productId,quantity,lastUpdated) VALUES (?,?,?,?,?)`)
    const upsertSale = db.prepare(`INSERT OR REPLACE INTO sales (id,branchId,month,amount,units) VALUES (?,?,?,?,?)`)
    const upsertSchedule = db.prepare(`INSERT OR REPLACE INTO schedules (id,inventoryType,fromDate,toDate,branchId,region,team,inOut,results,totalSales2026,lastInventoryResult,lastInventory,teamLeader,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const upsertInv2025 = db.prepare(`INSERT OR REPLACE INTO inv2025 (id,branchId,year,months,total,notes,col997) VALUES (?,?,?,?,?,?,?)`)
    const upsertInv2026 = db.prepare(`INSERT OR REPLACE INTO inv2026Items (id,branchId,date,cat,description,category,systemQty,physQty,varianceQty,costPrice,varianceValue) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    const upsertBlob = (table) => db.prepare(`INSERT OR REPLACE INTO ${table} (id,data) VALUES (?,?)`)

    const sync = db.transaction(() => {
      if (newData.branches) {
        db.prepare('DELETE FROM branches').run()
        for (const b of newData.branches) upsertBranch.run(b.id||uid(),b.name||'',b.branchCode||'',b.branchType||'Branch',b.area||'',b.areaManager||'',b.mobile||'',b.workingHours||'',b.location||'',b.branchClass||'A',b.manager||'',b.country||'',b.email||'',b.notes||'',b.lastInventory||'',b.inventoryValue||0,b.stockValue||0,b.managerId||'',b.deputyId||'',b.status||'Active',b.createdAt||'')
      }
      if (newData.products) {
        db.prepare('DELETE FROM products').run()
        for (const p of newData.products) upsertProduct.run(p.id||uid(),p.sku||'',p.barcode||'',p.name||'',p.description||'',p.category||'',p.qty||0,p.unitCost||0,p.totalPrice||0,p.salesPrice||0,p.minStock||0)
      }
      if (newData.stocks) {
        db.prepare('DELETE FROM stocks').run()
        for (const s of newData.stocks) upsertStock.run(s.id||uid(),s.branchId||'',s.productId||'',s.quantity||0,s.lastUpdated||'')
      }
      if (newData.sales) {
        db.prepare('DELETE FROM sales').run()
        for (const s of newData.sales) upsertSale.run(s.id||uid(),s.branchId||'',s.month||'',s.amount||0,s.units||0)
      }
      if (newData.schedules) {
        db.prepare('DELETE FROM schedules').run()
        for (const s of newData.schedules) upsertSchedule.run(s.id||uid(),s.inventoryType||'',s.from||s.fromDate||'',s.to||s.toDate||'',s.branchId||'',s.region||'',s.team||'',s.inOut||'',s.results||0,s.totalSales2026||0,s.lastInventoryResult||0,s.lastInventory||'',s.teamLeader||'',s.notes||'')
      }
      if (newData.inv2025) {
        db.prepare('DELETE FROM inv2025').run()
        for (const r of newData.inv2025) upsertInv2025.run(r.id||uid(),r.branchId||'',r.year||2025,JSON.stringify(r.months||{}),r.total||0,r.notes||'',r.col997||0)
      }
      if (newData.inv2026Items) {
        db.prepare('DELETE FROM inv2026Items').run()
        for (const r of newData.inv2026Items) upsertInv2026.run(r.id||uid(),r.branchId||'',r.date||'',r.cat||'',r.description||'',r.category||'',r.systemQty||0,r.physQty||0,r.varianceQty||0,r.costPrice||0,r.varianceValue||0)
      }
      for (const table of ['transfers','stockTakes','audits','damages']) {
        if (newData[table]) {
          db.prepare(`DELETE FROM ${table}`).run()
          const ins = upsertBlob(table)
          for (const r of newData[table]) ins.run(r.id||uid(), JSON.stringify(r))
        }
      }
    })
    sync()
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ ok: false, error: String(e) }) }
})

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body
    const db = getDB()
    const user = db.prepare('SELECT * FROM authUsers WHERE username = ? AND password = ?').get(username, password)
    if (user) {
      res.json({ ok: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
    } else {
      res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }
  } catch(e) { res.status(500).json({ ok: false, error: String(e) }) }
})

app.get('/api/users', (_req, res) => {
  try {
    const db = getDB()
    const users = db.prepare('SELECT id, username, name, role FROM authUsers').all()
    res.json(users)
  } catch(e) { res.status(500).json([]) }
})

app.post('/api/signup', (req, res) => {
  try {
    const { username, name, role, password } = req.body
    if (!username || !password) return res.status(400).json({ ok: false, error: 'Missing fields' })
    const db = getDB()
    const existing = db.prepare('SELECT id FROM authUsers WHERE username = ?').get(username)
    if (existing) return res.status(409).json({ ok: false, error: 'Username already exists' })
    db.prepare('INSERT INTO authUsers (id, username, password, name, role, status) VALUES (?,?,?,?,?,?)')
      .run(uid(), username, password, name || username, role || 'Viewer', 'Active')
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ ok: false, error: String(e) }) }
})

app.get('/api/ping', (_req, res) => res.json({ ok: true }))

// ── Branches ──────────────────────────────────────────────────────────────────
app.post('/api/bulk-branches', (req, res) => {
  try {
    const db = getDB()
    const newBranches = (req.body.branches || []).map(b => ({ ...b, id: uid() }))
    const insert = db.prepare(`INSERT OR REPLACE INTO branches (id,name,branchCode,branchType,area,areaManager,mobile,workingHours,location,branchClass,manager,country,email,notes,lastInventory,inventoryValue,stockValue,managerId,deputyId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const run = db.transaction((branches) => {
      for (const b of branches) insert.run(b.id,b.name||'',b.branchCode||'',b.branchType||'Branch',b.area||'',b.areaManager||'',b.mobile||'',b.workingHours||'',b.location||'',b.branchClass||'A',b.manager||'',b.country||'',b.email||'',b.notes||'',b.lastInventory||'',b.inventoryValue||0,b.stockValue||0,b.managerId||'',b.deputyId||'',b.status||'Active',b.createdAt||new Date().toISOString().slice(0,10))
    })
    run(newBranches)
    res.json({ ok: true, count: newBranches.length })
  } catch(e) { res.status(500).json({ ok: false, error: String(e) }) }
})

app.post('/api/branches/bulk', (req, res) => {
  try {
    const db = getDB()
    const newBranches = (req.body.branches || []).map(b => ({ ...b, id: uid() }))
    const insert = db.prepare(`INSERT OR REPLACE INTO branches (id,name,branchCode,branchType,area,areaManager,mobile,workingHours,location,branchClass,manager,country,email,notes,lastInventory,inventoryValue,stockValue,managerId,deputyId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const run = db.transaction((branches) => {
      for (const b of branches) insert.run(b.id,b.name||'',b.branchCode||'',b.branchType||'Branch',b.area||'',b.areaManager||'',b.mobile||'',b.workingHours||'',b.location||'',b.branchClass||'A',b.manager||'',b.country||'',b.email||'',b.notes||'',b.lastInventory||'',b.inventoryValue||0,b.stockValue||0,b.managerId||'',b.deputyId||'',b.status||'Active',b.createdAt||new Date().toISOString().slice(0,10))
    })
    run(newBranches)
    res.json({ ok: true, imported: newBranches.length })
  } catch(e) { res.status(500).json({ ok: false, error: String(e) }) }
})

// ── Products ──────────────────────────────────────────────────────────────────
app.get('/api/products/analytics', (req, res) => {
  try {
    const db = getDB()
    const products = db.prepare('SELECT * FROM products').all()
    const total = products.length

    const catMap = {}
    products.forEach(p => {
      const cat = (p.sku || '').split('-')[0] || 'Unknown'
      if (!catMap[cat]) catMap[cat] = { count: 0, totalQty: 0, totalValue: 0 }
      catMap[cat].count++
      catMap[cat].totalQty += (p.qty || 0)
      catMap[cat].totalValue += (p.qty || 0) * (p.unitCost || 0)
    })
    const categories = Object.entries(catMap)
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    const zeroCost  = products.filter(p => !p.unitCost || p.unitCost === 0).length
    const zeroQty   = products.filter(p => !p.qty || p.qty === 0).length
    const oneQty    = products.filter(p => p.qty === 1).length
    const totalQty  = products.reduce((s, p) => s + (p.qty || 0), 0)
    const totalValue = products.reduce((s, p) => s + (p.qty || 0) * (p.unitCost || 0), 0)
    const top10 = [...products]
      .map(p => ({ sku: p.sku, description: p.description, qty: p.qty, unitCost: p.unitCost, value: (p.qty||0)*(p.unitCost||0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    res.json({ total, zeroCost, zeroQty, oneQty, totalQty, totalValue, categories, top10 })
  } catch(e) { res.status(500).json({ error: String(e) }) }
})

app.get('/api/products', (req, res) => {
  try {
    const db = getDB()
    const search = (req.query.search || '').toLowerCase()
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 100
    const offset = (page - 1) * limit

    let items, total
    if (search) {
      const like = `%${search}%`
      total = db.prepare(`SELECT COUNT(*) as cnt FROM products WHERE lower(sku) LIKE ? OR lower(barcode) LIKE ? OR lower(description) LIKE ?`).get(like, like, like).cnt
      items = db.prepare(`SELECT * FROM products WHERE lower(sku) LIKE ? OR lower(barcode) LIKE ? OR lower(description) LIKE ? LIMIT ? OFFSET ?`).all(like, like, like, limit, offset)
    } else {
      total = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt
      items = db.prepare('SELECT * FROM products LIMIT ? OFFSET ?').all(limit, offset)
    }
    res.json({ items, total, page, totalPages: Math.ceil(total / limit) })
  } catch(e) { res.status(500).json({ error: String(e) }) }
})

app.post('/api/products', (req, res) => {
  try {
    const db = getDB()
    const p = { ...req.body, id: uid() }
    db.prepare(`INSERT OR REPLACE INTO products (id,sku,barcode,name,description,category,qty,unitCost,totalPrice,salesPrice,minStock) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(p.id, p.sku||'', p.barcode||'', p.name||'', p.description||'', p.category||'', p.qty||0, p.unitCost||0, p.totalPrice||0, p.salesPrice||0, p.minStock||0)
    res.json({ ok: true, product: p })
  } catch(e) { res.status(500).json({ ok: false }) }
})

app.put('/api/products/:id', (req, res) => {
  try {
    const db = getDB()
    const p = { ...req.body, id: req.params.id }
    db.prepare(`INSERT OR REPLACE INTO products (id,sku,barcode,name,description,category,qty,unitCost,totalPrice,salesPrice,minStock) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(p.id, p.sku||'', p.barcode||'', p.name||'', p.description||'', p.category||'', p.qty||0, p.unitCost||0, p.totalPrice||0, p.salesPrice||0, p.minStock||0)
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ ok: false }) }
})

app.delete('/api/products/:id', (req, res) => {
  try {
    const db = getDB()
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ ok: false }) }
})

app.delete('/api/products', (req, res) => {
  try {
    const db = getDB()
    db.prepare('DELETE FROM products').run()
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ ok: false }) }
})

app.delete('/api/products/clear', (_req, res) => {
  try {
    const db = getDB()
    db.prepare('DELETE FROM products').run()
    res.json({ ok: true })
  } catch(e) { res.status(500).json({ ok: false }) }
})

app.post('/api/bulk-products', (req, res) => {
  try {
    const db = getDB()
    const newProds = (req.body.products || []).map(p => ({ ...p, id: uid() }))
    const insert = db.prepare(`INSERT OR REPLACE INTO products (id,sku,barcode,name,description,category,qty,unitCost,totalPrice,salesPrice,minStock) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    const run = db.transaction((prods) => {
      for (const p of prods) insert.run(p.id, p.sku||'', p.barcode||'', p.name||'', p.description||'', p.category||'', p.qty||0, p.unitCost||0, p.totalPrice||0, p.salesPrice||0, p.minStock||0)
    })
    run(newProds)
    res.json({ ok: true, count: newProds.length })
  } catch(e) { res.status(500).json({ ok: false, error: String(e) }) }
})

// ── Debug ─────────────────────────────────────────────────────────────────────
const DIST_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
app.get('/api/debug-path', (_req, res) => res.json({ distDir: DIST_DIR, exists: fs.existsSync(DIST_DIR) }))

// ── Serve built frontend ──────────────────────────────────────────────────────
app.use(express.static(DIST_DIR))
app.get(/.*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))

// ── Branch Excel import (JSON rows sent from client) ─────────────────────────
app.post('/api/branches/import-excel', (req, res) => {
  try {
    const { rows, mode = 'add' } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'No data provided' })
    }

    const db = getDB()
    const validClasses = ['Al Fursan', 'A', 'B', 'C', 'D']

    const findVal = (row, ...keys) => {
      for (const key of keys) {
        const k = Object.keys(row).find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim())
        if (k) return row[k]
      }
      return ''
    }
    const fv = (v) => String(v ?? '').trim()

    const previousCount = db.prepare('SELECT COUNT(*) as cnt FROM branches').get().cnt

    if (mode === 'replace') {
      db.prepare('DELETE FROM branches').run()
      console.log(`[Import] Cleared ${previousCount} branches for replacement`)
    }

    const insert = db.prepare(`INSERT OR REPLACE INTO branches (id,name,branchCode,branchType,area,areaManager,mobile,workingHours,location,branchClass,manager,country,email,notes,lastInventory,inventoryValue,stockValue,managerId,deputyId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

    let added = 0, updated = 0, skipped = 0

    const doImport = db.transaction(() => {
      rows.forEach((row, idx) => {
        try {
          let code = fv(findVal(row, 'Branch Code', 'B.Code', 'Code', 'B Code', 'BranchCode', 'كود الفرع', 'كود'))
          if (!code) code = fv(row['Branch Code'] || row['B.Code'] || row['Code'] || row['B Code'])
          const name = fv(findVal(row, 'Branch Name', 'Name', 'اسم الفرع'))
          console.log(`Row ${idx}: code="${code}", name="${name}"`)
          if (!code && !name) { skipped++; return }

          const cls = fv(findVal(row, 'Class', 'CLASS'))
          let branchType = 'Branch'
          const lowerName = name.toLowerCase()
          if (lowerName.includes('تالف') || lowerName.includes('damage')) branchType = 'Damage'
          else if (lowerName.includes('مستودع') || lowerName.includes('مخزن') || lowerName.includes('warehouse')) branchType = 'Warehouse'
          else if (lowerName.includes('مكتب') || lowerName.includes('office')) branchType = 'Office'

          const branchData = {
            name: name || code,
            branchCode: code,
            branchType,
            area: fv(findVal(row, 'Area', 'AREA')),
            areaManager: fv(findVal(row, 'Area Manager', 'AreaManager')),
            mobile: fv(findVal(row, 'Mobile Number', 'Mobile', 'Phone')),
            workingHours: fv(findVal(row, 'Working Hours', 'WorkingHours')),
            location: fv(findVal(row, 'Location', 'LOCATION')),
            branchClass: validClasses.includes(cls) ? cls : 'A',
            manager: fv(findVal(row, 'Branch Manager', 'BranchManager', 'Manager')),
            country: fv(findVal(row, 'Country', 'COUNTRY')),
            email: fv(findVal(row, 'Branch Email', 'EMAIL', 'Email')),
            notes: fv(findVal(row, 'Notes', 'NOTE')),
            lastInventory: fv(findVal(row, 'Last Inventory', 'LastInventory')) || new Date().toISOString().slice(0, 10),
            inventoryValue: Number(String(findVal(row, 'Results (ر.س)', 'Results', 'Result') || 0).replace(/[^0-9.-]/g, '')),
            stockValue: Number(String(findVal(row, 'Stock Value', 'StockValue') || 0).replace(/[^0-9.-]/g, '')),
            managerId: '', deputyId: '', status: 'Active',
            createdAt: new Date().toISOString().slice(0, 10)
          }

          if (mode !== 'replace') {
            const existing = code
              ? db.prepare('SELECT id FROM branches WHERE lower(branchCode) = ?').get(code.toLowerCase())
              : db.prepare('SELECT id FROM branches WHERE lower(name) = ?').get(name.toLowerCase())
            if (existing) {
              db.prepare(`UPDATE branches SET name=?,branchCode=?,branchType=?,area=?,areaManager=?,mobile=?,workingHours=?,location=?,branchClass=?,manager=?,country=?,email=?,notes=?,lastInventory=?,inventoryValue=?,stockValue=?,managerId=?,deputyId=?,status=?,createdAt=? WHERE id=?`)
                .run(branchData.name,branchData.branchCode,branchData.branchType,branchData.area,branchData.areaManager,branchData.mobile,branchData.workingHours,branchData.location,branchData.branchClass,branchData.manager,branchData.country,branchData.email,branchData.notes,branchData.lastInventory,branchData.inventoryValue,branchData.stockValue,branchData.managerId,branchData.deputyId,branchData.status,branchData.createdAt,existing.id)
              updated++
              return
            }
          }
          insert.run(uid(),branchData.name,branchData.branchCode,branchData.branchType,branchData.area,branchData.areaManager,branchData.mobile,branchData.workingHours,branchData.location,branchData.branchClass,branchData.manager,branchData.country,branchData.email,branchData.notes,branchData.lastInventory,branchData.inventoryValue,branchData.stockValue,branchData.managerId,branchData.deputyId,branchData.status,branchData.createdAt)
          added++
        } catch (rowErr) { console.error(`Row ${idx} error:`, rowErr); skipped++ }
      })
    })
    doImport()

    const currentTotal = db.prepare('SELECT COUNT(*) as cnt FROM branches').get().cnt
    console.log(`Import complete: ${added} added, ${updated} updated`)
    res.json({ ok: true, mode, added, updated, skipped, imported: added + updated, total: rows.length, previousTotal: previousCount, currentTotal })
  } catch(e) {
    console.error('Import error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// ── Branch Excel file upload ───────────────────────────────────────────────────
const upload = multer({ dest: 'uploads/' })

app.post('/api/branches/upload-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' })

    const workbook = XLSX.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const db = getDB()
    const validClasses = ['Al Fursan', 'A', 'B', 'C', 'D']

    const findVal = (row, ...keys) => {
      for (const key of keys) {
        const k = Object.keys(row).find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim())
        if (k) return row[k]
      }
      return ''
    }
    const fv = (v) => String(v ?? '').trim()

    const previousCount = db.prepare('SELECT COUNT(*) as cnt FROM branches').get().cnt
    db.prepare('DELETE FROM branches').run()

    const insert = db.prepare(`INSERT INTO branches (id,name,branchCode,branchType,area,areaManager,mobile,workingHours,location,branchClass,manager,country,email,notes,lastInventory,inventoryValue,stockValue,managerId,deputyId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

    let added = 0, skipped = 0

    const doImport = db.transaction(() => {
      rows.forEach((row, idx) => {
        try {
          const keys = Object.keys(row)
          console.log('[Import] Row keys:', keys)

          let name = '', code = ''
          for (const key of keys) {
            const lk = key.toLowerCase().trim()
            if (lk.includes('name') || lk.includes('فرع') || lk.includes('اسم')) { name = String(row[key]||'').trim(); if (name) break }
          }
          for (const key of keys) {
            const lk = key.toLowerCase().trim()
            if (lk.includes('code') || lk.includes('كود') || lk === 'b.code' || lk === 'bcode') { code = String(row[key]||'').trim(); if (code) break }
          }
          console.log(`[Import] Found: name="${name}", code="${code}"`)
          if (!code && !name) { skipped++; return }

          const cls = fv(findVal(row, 'Class', 'CLASS'))
          insert.run(uid(),name||code,code,'Branch',fv(findVal(row,'Area','AREA')),fv(findVal(row,'Area Manager','AreaManager')),fv(findVal(row,'Mobile Number','Mobile','Phone')),fv(findVal(row,'Working Hours','WorkingHours')),fv(findVal(row,'Location','LOCATION')),validClasses.includes(cls)?cls:'A',fv(findVal(row,'Branch Manager','BranchManager','Manager')),fv(findVal(row,'Country','COUNTRY')),fv(findVal(row,'Branch Email','EMAIL','Email')),fv(findVal(row,'Notes','NOTE')),fv(findVal(row,'Last Inventory','LastInventory'))||new Date().toISOString().slice(0,10),Number(String(findVal(row,'Results (ر.س)','Results','Result')||0).replace(/[^0-9.-]/g,'')),Number(String(findVal(row,'Stock Value','StockValue')||0).replace(/[^0-9.-]/g,'')),'','','Active',new Date().toISOString().slice(0,10))
          added++
        } catch(err) { console.error(`Row ${idx} error:`, err); skipped++ }
      })
    })
    doImport()

    try { fs.unlinkSync(req.file.path) } catch {}

    const currentTotal = db.prepare('SELECT COUNT(*) as cnt FROM branches').get().cnt
    res.json({ ok: true, imported: added, skipped, total: rows.length, previousTotal: previousCount, currentTotal })
  } catch(e) {
    console.error('Upload error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// ── Direct Excel import endpoints ────────────────────────────────────────────

// Import Branches from Excel
app.post('/api/import/branches', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' })

    const workbook = XLSX.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const db = getDB()

    // Clear all branches first
    db.prepare('DELETE FROM branches').run()

    const insert = db.prepare(`
      INSERT INTO branches (id, name, branchCode, branchType, area, areaManager, mobile, workingHours, location, branchClass, manager, country, email, notes, lastInventory, inventoryValue, stockValue, managerId, deputyId, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const uid2 = () => Math.random().toString(36).slice(2, 10)
    const validClasses = ['Al Fursan', 'A', 'B', 'C', 'D']

    let added = 0

    for (const row of rows) {
      const keys = Object.keys(row)

      // Find code column
      let code = ''
      for (const key of keys) {
        const lower = key.toLowerCase().trim()
        if (lower.includes('code') || lower.includes('كود') || lower === 'b.code' || lower === 'bcode') {
          code = String(row[key] || '').trim()
          if (code) break
        }
      }

      // Find name column
      let name = ''
      for (const key of keys) {
        const lower = key.toLowerCase().trim()
        if (lower.includes('name') || lower.includes('فرع') || lower.includes('اسم')) {
          name = String(row[key] || '').trim()
          if (name) break
        }
      }

      if (!code && !name) continue

      // Detect type
      let branchType = 'Branch'
      const lowerName = name.toLowerCase()
      if (lowerName.includes('تالف') || lowerName.includes('damage')) branchType = 'Damage'
      else if (lowerName.includes('مستودع') || lowerName.includes('مخزن')) branchType = 'Warehouse'
      else if (lowerName.includes('مكتب')) branchType = 'Office'

      // Find other columns
      const findVal = (keywords) => {
        for (const key of keys) {
          const lower = key.toLowerCase().trim()
          for (const kw of keywords) {
            if (lower.includes(kw.toLowerCase())) return String(row[key] || '').trim()
          }
        }
        return ''
      }

      const cls = findVal(['Class', 'CLASS', 'الفئة'])

      insert.run(
        uid2(),
        name || code,
        code,
        branchType,
        findVal(['Area', 'AREA', 'المنطقة']),
        findVal(['Area Manager', 'AreaManager', 'مدير المنطقة']),
        findVal(['Mobile', 'Phone', 'الهاتف']),
        findVal(['Working Hours', 'ساعات العمل']),
        findVal(['Location', 'الموقع']),
        validClasses.includes(cls) ? cls : 'A',
        findVal(['Manager', 'المدير']),
        findVal(['Country', 'الدولة']),
        findVal(['Email', 'البريد']),
        findVal(['Notes', 'ملاحظات']),
        findVal(['Last Inventory']) || new Date().toISOString().slice(0, 10),
        0, 0, '', '', 'Active', new Date().toISOString().slice(0, 10)
      )

      added++
    }

    // Cleanup
    try { fs.unlinkSync(req.file.path) } catch {}

    res.json({ ok: true, imported: added, total: rows.length })

  } catch (e) {
    console.error('Import error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Import Results 2025 from Excel
app.post('/api/import/inv2025', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' })

    const workbook = XLSX.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    const db = getDB()

    // Clear existing 2025 data
    db.prepare('DELETE FROM inv2025').run()

    const insert = db.prepare(`
      INSERT INTO inv2025 (id, branchId, year, months, col997, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const uid2 = () => Math.random().toString(36).slice(2, 10)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    let added = 0

    for (const row of rows) {
      const keys = Object.keys(row)

      // Find branch code/name
      let code = ''
      let name = ''
      for (const key of keys) {
        const lower = key.toLowerCase().trim()
        if (lower.includes('code') || lower.includes('كود')) code = String(row[key] || '').trim()
        if (lower.includes('name') || lower.includes('فرع')) name = String(row[key] || '').trim()
      }

      if (!code && !name) continue

      // Find branch in database
      const branch = db.prepare('SELECT id FROM branches WHERE branchCode = ? OR name = ?').get(code, name)
      if (!branch) continue

      // Read months
      const monthData = {}
      let total = 0
      for (const m of months) {
        for (const key of keys) {
          if (key.trim() === m) {
            const val = Number(row[key]) || 0
            monthData[m] = val
            total += val
            break
          }
        }
      }

      // Read 997
      let col997 = 0
      for (const key of keys) {
        if (key.trim() === '997' || key.trim().toLowerCase() === '997') {
          col997 = Number(row[key]) || 0
          total += col997
          break
        }
      }

      insert.run(uid2(), branch.id, 2025, JSON.stringify(monthData), col997, total, '')
      added++
    }

    try { fs.unlinkSync(req.file.path) } catch {}

    res.json({ ok: true, imported: added, total: rows.length })

  } catch (e) {
    console.error('Import error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Import Results 2026 from Excel
app.post('/api/import/inv2026', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' })
    
    const workbook = XLSX.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    
    const db = getDB()
    
    // Clear existing 2026 data
    db.prepare('DELETE FROM inventory2026').run()
    
    const insert = db.prepare(`
      INSERT INTO inventory2026 (id, branchId, date, cat, description, category, systemQty, physQty, varianceQty, costPrice, varianceValue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const uid2 = () => Math.random().toString(36).slice(2, 10)
    
    let added = 0
    
    for (const row of rows) {
      const keys = Object.keys(row)
      
      // Find branch
      let code = ''
      let name = ''
      for (const key of keys) {
        const lower = key.toLowerCase().trim()
        if (lower.includes('code') || lower.includes('كود')) code = String(row[key] || '').trim()
        if (lower.includes('name') || lower.includes('فرع')) name = String(row[key] || '').trim()
      }
      
      if (!code && !name) continue
      
      // Find branch in database
      const branch = db.prepare('SELECT id FROM branches WHERE branchCode = ? OR name = ?').get(code, name)
      if (!branch) continue
      
      // Read columns
      const findVal = (keywords) => {
        for (const key of keys) {
          const lower = key.toLowerCase().trim()
          for (const kw of keywords) {
            if (lower.includes(kw.toLowerCase())) return String(row[key] || '').trim()
          }
        }
        return ''
      }
      
      const systemQty = Number(findVal(['System Qty', 'System', 'systemqty'])) || 0
      const physQty = Number(findVal(['Phys Qty', 'Physical Qty', 'physqty', 'physical'])) || 0
      const varianceQty = Number(findVal(['Variance Qty', 'Variance', 'varianceqty'])) || (physQty - systemQty)
      const costPrice = Number(findVal(['Cost Price', 'Cost', 'costprice'])) || 0
      const varianceValue = Number(findVal(['Variance Value', 'Value', 'variancevalue'])) || (varianceQty * costPrice)
      
      insert.run(
        uid2(),
        branch.id,
        findVal(['Date', 'date']) || new Date().toISOString().slice(0, 10),
        findVal(['Cat', 'SKU', 'Code', 'Item']),
        findVal(['Description', 'Desc', 'Name']),
        findVal(['Category', 'Cat']),
        systemQty,
        physQty,
        varianceQty,
        costPrice,
        varianceValue
      )
      
      added++
    }
    
    try { require('fs').unlinkSync(req.file.path) } catch {}
    
    res.json({ ok: true, imported: added, total: rows.length })
    
  } catch (e) {
    console.error('Import error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Import Results 2026 from JSON (frontend reads Excel, sends JSON)
app.post('/api/inv2026/bulk', (req, res) => {
  try {
    const { branchId, items } = req.body
    if (!branchId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'branchId and items are required' })
    }

    const db = getDB()
    const insert = db.prepare(`INSERT OR REPLACE INTO inv2026Items (id,branchId,date,cat,description,category,systemQty,physQty,varianceQty,costPrice,varianceValue) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    const today = new Date().toISOString().slice(0, 10)

    const bulkInsert = db.transaction((rows) => {
      for (const item of rows) {
        insert.run(
          uid(),
          branchId,
          today,
          item.cat || '',
          item.description || '',
          item.category || '',
          item.systemQty || 0,
          item.physQty || 0,
          item.varianceQty || 0,
          item.costPrice || 0,
          item.varianceValue || 0
        )
      }
    })

    bulkInsert(items)

    res.json({ ok: true, inserted: items.length })
  } catch (e) {
    console.error('Bulk inv2026 error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Import Results 2025 - reads Excel directly in backend
app.post('/api/import/inv2025-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' })
    
    const workbook = XLSX.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })

    console.log(`[Import 2025] Read ${rows.length} rows`)
    console.log('[Import 2025] Columns:', rows.length > 0 ? Object.keys(rows[0]) : 'none')
    
    const db = getDB()
    
    // Clear existing data
    db.prepare('DELETE FROM inv2025').run()
    
    const insert = db.prepare(`
      INSERT INTO inv2025 (id, branchId, year, months, col997, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    const uid2 = () => Math.random().toString(36).slice(2, 10)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    let added = 0
    
    const insertBranch = db.prepare(`INSERT INTO branches (id,name,branchCode,branchType,area,areaManager,mobile,workingHours,location,branchClass,manager,country,email,notes,lastInventory,inventoryValue,stockValue,managerId,deputyId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)

    for (const row of rows) {
      const keys = Object.keys(row)

      // Find branch code/name
      let code = '', name = ''
      for (const key of keys) {
        const lower = key.toLowerCase().trim()
        if (lower.includes('code') || lower === 'b.code' || lower === 'bcode') code = String(row[key] || '').trim()
        if (lower.includes('name') || lower.includes('branch')) name = String(row[key] || '').trim()
      }

      if (!code && !name) continue

      // Skip the "Grand Total" summary row
      if (code.toLowerCase() === 'grand total' || name.toLowerCase() === 'grand total') continue

      // Find branch in database, or auto-create if missing
      let branch = db.prepare('SELECT id FROM branches WHERE branchCode = ? OR name = ?').get(code, name)
      if (!branch) {
        const newId = uid2()
        insertBranch.run(newId, name || code, code || '', 'Branch', '', '', '', '', '', 'A', '', '', '', '[auto-created from import]', '', 0, 0, '', '', 'Active', new Date().toISOString().slice(0,10))
        branch = { id: newId }
        console.log(`[Import 2025] Auto-created branch: ${code || name}`)
      }
      
      // Read months
      const monthData = {}
      let total = 0
      
      for (const m of months) {
        for (const key of keys) {
          if (key.trim().toLowerCase() === m.toLowerCase()) {
            const val = parseFloat(row[key]) || 0
            monthData[m] = val
            total += val
            break
          }
        }
      }
      
      // Read 997
      let col997 = 0
      for (const key of keys) {
        if (key.trim() === '997' || key.trim().toLowerCase().includes('997')) {
          col997 = parseFloat(row[key]) || 0
          total += col997
          break
        }
      }
      
      insert.run(uid2(), branch.id, 2025, JSON.stringify(monthData), col997, total, '')
      added++
    }
    
    // Cleanup
    try { fs.unlinkSync(req.file.path) } catch {}
    
    console.log(`[Import 2025] Added ${added} records`)
    res.json({ ok: true, imported: added, total: rows.length })
    
  } catch (e) {
    console.error('[Import 2025] Error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Import Results 2026 - reads Excel directly in backend  
app.post('/api/import/inv2026-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' })
    
    const workbook = XLSX.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
    
    console.log(`[Import 2026] Read ${rows.length} rows`)
    console.log('[Import 2026] Columns:', rows.length > 0 ? Object.keys(rows[0]) : 'none')
    
    const db = getDB()
    
    // Get branchId from query or body
    const branchId = req.body.branchId || req.query.branchId
    if (!branchId) {
      return res.status(400).json({ ok: false, error: 'Branch ID required' })
    }
    
    const insert = db.prepare(`
      INSERT INTO inv2026Items (id, branchId, date, cat, description, category, systemQty, physQty, varianceQty, costPrice, varianceValue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const uid2 = () => Math.random().toString(36).slice(2, 10)
    
    let added = 0
    
    for (const row of rows) {
      const keys = Object.keys(row)
      
      // Find columns (case insensitive)
      const getVal = (names) => {
        for (const name of names) {
          const key = keys.find(k => k.toLowerCase().trim() === name.toLowerCase())
          if (key) return row[key]
        }
        return ''
      }
      
      const cat = String(getVal(['cat', 'sku', 'code', 'item']) || '')
      const desc = String(getVal(['description', 'desc', 'name']) || '')
      const category = String(getVal(['category', 'type']) || '')
      
      if (!cat && !desc) continue
      
      const sQty = parseFloat(getVal(['systemqty', 'system qty', 'system'])) || 0
      const pQty = parseFloat(getVal(['physqty', 'phys qty', 'physical'])) || 0
      const vQty = parseFloat(getVal(['varianceqty', 'variance qty', 'variance'])) || (pQty - sQty)
      const cost = parseFloat(getVal(['costprice', 'cost price', 'cost'])) || 0
      const vVal = parseFloat(getVal(['variancevalue', 'variance value', 'value'])) || (vQty * cost)
      
      insert.run(uid2(), branchId, new Date().toISOString().slice(0,10), cat, desc, category, sQty, pQty, vQty, cost, vVal)
      added++
    }
    
    try { fs.unlinkSync(req.file.path) } catch {}
    
    console.log(`[Import 2026] Added ${added} records`)
    res.json({ ok: true, imported: added, total: rows.length })
    
  } catch (e) {
    console.error('[Import 2026] Error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`)
  console.log(`Network:  http://10.10.69.10:${PORT}`)
})

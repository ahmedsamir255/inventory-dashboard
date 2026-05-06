import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'db.json')

function migrate() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No db.json found, nothing to migrate.')
    return
  }

  console.log('Reading db.json...')
  const jsonData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  const db = initDB()

  const uid = () => Math.random().toString(36).slice(2, 10)

  // ── branches ──────────────────────────────────────────────────────────────
  const insertBranch = db.prepare(`
    INSERT OR REPLACE INTO branches
      (id, name, branchCode, branchType, area, areaManager, mobile, workingHours,
       location, branchClass, manager, country, email, notes, lastInventory,
       inventoryValue, stockValue, managerId, deputyId, status, createdAt)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const migrateBranches = db.transaction((branches) => {
    for (const b of branches) {
      insertBranch.run(
        b.id || uid(),
        b.name || '',
        b.branchCode || '',
        b.branchType || 'Branch',
        b.area || '',
        b.areaManager || '',
        b.mobile || '',
        b.workingHours || '',
        b.location || '',
        b.branchClass || 'A',
        b.manager || '',
        b.country || '',
        b.email || '',
        b.notes || '',
        b.lastInventory || '',
        b.inventoryValue || 0,
        b.stockValue || 0,
        b.managerId || '',
        b.deputyId || '',
        b.status || 'Active',
        b.createdAt || new Date().toISOString().slice(0, 10)
      )
    }
  })
  migrateBranches(jsonData.branches || [])
  console.log(`Migrated ${jsonData.branches?.length || 0} branches`)

  // ── products ──────────────────────────────────────────────────────────────
  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products
      (id, sku, barcode, name, description, category, qty, unitCost, totalPrice, salesPrice, minStock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const migrateProducts = db.transaction((products) => {
    for (const p of products) {
      insertProduct.run(
        p.id || uid(),
        p.sku || '',
        p.barcode || '',
        p.name || '',
        p.description || '',
        p.category || '',
        p.qty || 0,
        p.unitCost || 0,
        p.totalPrice || 0,
        p.salesPrice || 0,
        p.minStock || 0
      )
    }
  })
  migrateProducts(jsonData.products || [])
  console.log(`Migrated ${jsonData.products?.length || 0} products`)

  // ── stocks ─────────────────────────────────────────────────────────────────
  const insertStock = db.prepare(`
    INSERT OR REPLACE INTO stocks (id, branchId, productId, quantity, lastUpdated)
    VALUES (?, ?, ?, ?, ?)
  `)
  const migrateStocks = db.transaction((stocks) => {
    for (const s of stocks) {
      insertStock.run(s.id || uid(), s.branchId || '', s.productId || '', s.quantity || 0, s.lastUpdated || '')
    }
  })
  migrateStocks(jsonData.stocks || [])
  console.log(`Migrated ${jsonData.stocks?.length || 0} stocks`)

  // ── simple blob tables (transfers, stockTakes, audits, damages) ───────────
  for (const table of ['transfers', 'stockTakes', 'audits', 'damages']) {
    const insertRow = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)
    const migrateBlobs = db.transaction((rows) => {
      for (const r of rows) {
        insertRow.run(r.id || uid(), JSON.stringify(r))
      }
    })
    migrateBlobs(jsonData[table] || [])
    console.log(`Migrated ${jsonData[table]?.length || 0} ${table}`)
  }

  // ── sales ─────────────────────────────────────────────────────────────────
  const insertSale = db.prepare(`
    INSERT OR REPLACE INTO sales (id, branchId, month, amount, units)
    VALUES (?, ?, ?, ?, ?)
  `)
  const migrateSales = db.transaction((sales) => {
    for (const s of sales) {
      insertSale.run(s.id || uid(), s.branchId || '', s.month || '', s.amount || 0, s.units || 0)
    }
  })
  migrateSales(jsonData.sales || [])
  console.log(`Migrated ${jsonData.sales?.length || 0} sales`)

  // ── schedules ─────────────────────────────────────────────────────────────
  const insertSchedule = db.prepare(`
    INSERT OR REPLACE INTO schedules
      (id, inventoryType, fromDate, toDate, branchId, region, team, inOut,
       results, totalSales2026, lastInventoryResult, lastInventory, teamLeader, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const migrateSchedules = db.transaction((schedules) => {
    for (const s of schedules) {
      insertSchedule.run(
        s.id || uid(),
        s.inventoryType || '',
        s.from || s.fromDate || '',
        s.to || s.toDate || '',
        s.branchId || '',
        s.region || '',
        s.team || '',
        s.inOut || '',
        s.results || 0,
        s.totalSales2026 || 0,
        s.lastInventoryResult || 0,
        s.lastInventory || '',
        s.teamLeader || '',
        s.notes || ''
      )
    }
  })
  migrateSchedules(jsonData.schedules || [])
  console.log(`Migrated ${jsonData.schedules?.length || 0} schedules`)

  // ── inv2025 ───────────────────────────────────────────────────────────────
  const insertInv2025 = db.prepare(`
    INSERT OR REPLACE INTO inv2025 (id, branchId, year, months, total, notes, col997)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const migrateInv2025 = db.transaction((rows) => {
    for (const r of rows) {
      insertInv2025.run(
        r.id || uid(),
        r.branchId || '',
        r.year || 2025,
        JSON.stringify(r.months || {}),
        r.total || 0,
        r.notes || '',
        r.col997 || 0
      )
    }
  })
  migrateInv2025(jsonData.inv2025 || [])
  console.log(`Migrated ${jsonData.inv2025?.length || 0} inv2025 records`)

  // ── inv2026Items ───────────────────────────────────────────────────────────
  const insertInv2026 = db.prepare(`
    INSERT OR REPLACE INTO inv2026Items
      (id, branchId, date, cat, description, category, systemQty, physQty, varianceQty, costPrice, varianceValue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const migrateInv2026 = db.transaction((rows) => {
    for (const r of rows) {
      insertInv2026.run(
        r.id || uid(),
        r.branchId || '',
        r.date || '',
        r.cat || '',
        r.description || '',
        r.category || '',
        r.systemQty || 0,
        r.physQty || 0,
        r.varianceQty || 0,
        r.costPrice || 0,
        r.varianceValue || 0
      )
    }
  })
  migrateInv2026(jsonData.inv2026Items || [])
  console.log(`Migrated ${jsonData.inv2026Items?.length || 0} inv2026Items records`)

  // ── authUsers ─────────────────────────────────────────────────────────────
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO authUsers (id, username, password, name, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const migrateUsers = db.transaction((users) => {
    for (const u of users) {
      insertUser.run(u.id || uid(), u.username || '', u.password || '', u.name || '', u.role || 'Viewer', u.status || 'Active')
    }
  })
  migrateUsers(jsonData.authUsers || [])
  console.log(`Migrated ${jsonData.authUsers?.length || 0} authUsers`)

  console.log('\nMigration complete! SQLite database written to data.db')
}

migrate()

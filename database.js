import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_PATH = path.join(__dirname, 'data.db')

let db

export function initDB() {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      branchCode TEXT,
      branchType TEXT DEFAULT 'Branch',
      area TEXT DEFAULT '',
      areaManager TEXT DEFAULT '',
      mobile TEXT DEFAULT '',
      workingHours TEXT DEFAULT '',
      location TEXT DEFAULT '',
      branchClass TEXT DEFAULT 'A',
      manager TEXT DEFAULT '',
      country TEXT DEFAULT '',
      email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      lastInventory TEXT DEFAULT '',
      inventoryValue REAL DEFAULT 0,
      stockValue REAL DEFAULT 0,
      managerId TEXT DEFAULT '',
      deputyId TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      createdAt TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT DEFAULT '',
      barcode TEXT DEFAULT '',
      name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      qty REAL DEFAULT 0,
      unitCost REAL DEFAULT 0,
      totalPrice REAL DEFAULT 0,
      salesPrice REAL DEFAULT 0,
      minStock REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      branchId TEXT DEFAULT '',
      productId TEXT DEFAULT '',
      quantity REAL DEFAULT 0,
      lastUpdated TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      data TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS stockTakes (
      id TEXT PRIMARY KEY,
      data TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      data TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS damages (
      id TEXT PRIMARY KEY,
      data TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      branchId TEXT DEFAULT '',
      month TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      units REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      inventoryType TEXT DEFAULT '',
      fromDate TEXT DEFAULT '',
      toDate TEXT DEFAULT '',
      branchId TEXT DEFAULT '',
      region TEXT DEFAULT '',
      team TEXT DEFAULT '',
      inOut TEXT DEFAULT '',
      results REAL DEFAULT 0,
      totalSales2026 REAL DEFAULT 0,
      lastInventoryResult REAL DEFAULT 0,
      lastInventory TEXT DEFAULT '',
      teamLeader TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS inv2025 (
      id TEXT PRIMARY KEY,
      branchId TEXT NOT NULL,
      year INTEGER DEFAULT 2025,
      months TEXT DEFAULT '{}',
      total REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      col997 REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inv2026Items (
      id TEXT PRIMARY KEY,
      branchId TEXT DEFAULT '',
      date TEXT DEFAULT '',
      cat TEXT DEFAULT '',
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      systemQty REAL DEFAULT 0,
      physQty REAL DEFAULT 0,
      varianceQty REAL DEFAULT 0,
      costPrice REAL DEFAULT 0,
      varianceValue REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS authUsers (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT DEFAULT '',
      role TEXT DEFAULT 'Viewer',
      status TEXT DEFAULT 'Active'
    );
  `)

  return db
}

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

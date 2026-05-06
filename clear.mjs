import { readFileSync, writeFileSync } from 'fs'
const path = 'C:/Users/User/.verdent/verdent-projects/inventory-system/db.json'
const db = JSON.parse(readFileSync(path, 'utf8'))
db.products = []
db.branches = []
db.schedules = []
db.inv2025 = []
db.stocks = []
writeFileSync(path, JSON.stringify(db, null, 2), 'utf8')
console.log('Cleared. Users preserved:', db.authUsers?.length)
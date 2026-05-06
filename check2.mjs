import { readFileSync } from 'fs'
const db = JSON.parse(readFileSync('C:/Users/User/.verdent/verdent-projects/inventory-system/db.json', 'utf8'))
console.log('Branches count:', db.branches.length)
if (db.branches.length > 0) {
  db.branches.slice(0,5).forEach(b => {
    console.log(`${b.branchCode} | ${b.name} | stockValue: ${b.stockValue} | inventoryValue: ${b.inventoryValue}`)
  })
}
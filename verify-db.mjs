import { readFileSync, writeFileSync } from 'fs'
const path = 'C:/Users/User/.verdent/verdent-projects/inventory-system/db.json'
try {
  const content = readFileSync(path, 'utf8')
  const db = JSON.parse(content)
  console.log('Products:', db.products.length)
  console.log('Users:', db.authUsers?.length || 0)
  // Re-write with proper UTF-8 to ensure clean state
  writeFileSync(path, JSON.stringify(db, null, 2), 'utf8')
  console.log('OK - db.json is valid and re-written clean')
} catch(e) { console.error('ERROR:', e.message) }
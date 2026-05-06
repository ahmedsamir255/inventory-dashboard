import { readFileSync } from 'fs'
const db = JSON.parse(readFileSync('C:/Users/User/.verdent/verdent-projects/inventory-system/db.json', 'utf8'))
// Check products for Arabic
const arabicProducts = db.products.filter(p => /[\u0600-\u06FF]/.test(p.description)).slice(0,3)
const corruptedProducts = db.products.filter(p => /Ø|Ù|Ã|â€/.test(p.description)).slice(0,3)
console.log('Arabic products sample:', JSON.stringify(arabicProducts[0]?.description))
console.log('Corrupted products:', corruptedProducts.length)
console.log('Users:', JSON.stringify(db.authUsers?.map(u=>u.username)))
console.log('Branches count:', db.branches?.length)
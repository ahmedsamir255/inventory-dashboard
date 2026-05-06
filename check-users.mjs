import { readFileSync } from 'fs'
const db = JSON.parse(readFileSync('C:/Users/User/.verdent/verdent-projects/inventory-system/db.json', 'utf8'))
db.authUsers?.forEach(u => console.log(`username: ${u.username} | password: ${u.password} | role: ${u.role}`))
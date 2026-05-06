import { readFileSync, writeFileSync } from 'fs'
const path = 'C:/Users/User/.verdent/verdent-projects/inventory-system/db.json'

// Read raw bytes
const buf = readFileSync(path)
const text = buf.toString('utf8')

// Fix double-encoded UTF-8: each Arabic char was stored as Latin-1 bytes then re-encoded as UTF-8
function fixEncoding(str) {
  if (typeof str !== 'string') return str
  try {
    // Encode the string as Latin-1 bytes, then decode as UTF-8
    const bytes = Buffer.from(str, 'latin1')
    const fixed = bytes.toString('utf8')
    // Only return fixed if it contains valid non-ASCII (Arabic) chars
    return fixed
  } catch { return str }
}

function fixObj(obj) {
  if (typeof obj === 'string') return fixEncoding(obj)
  if (Array.isArray(obj)) return obj.map(fixObj)
  if (obj && typeof obj === 'object') {
    const out = {}
    for (const k of Object.keys(obj)) out[k] = fixObj(obj[k])
    return out
  }
  return obj
}

const db = JSON.parse(text)
const fixed = fixObj(db)

// Verify fix worked
const testBranch = fixed.branches?.[0]
console.log('Sample branch name:', testBranch?.name)
console.log('Sample region:', fixed.schedules?.[0]?.region || 'no schedules')

writeFileSync(path, JSON.stringify(fixed, null, 2), 'utf8')
console.log('DB fixed successfully!')
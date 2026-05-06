const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const DB_FILE = path.join(__dirname, 'db.json')

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch {
    return { branches: [], products: [], schedules: [], sales: [], damaged: [], users: [], authUsers: [] }
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

// Auth
app.post('/api/login', (req, res) => {
  const db = readDB()
  const user = db.authUsers?.find(u => u.username === req.body.username && u.password === req.body.password)
  if (user) {
    res.json({ ok: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } else {
    res.status(401).json({ ok: false })
  }
})

// Get state
app.get('/api/state', (req, res) => {
  const db = readDB()
  res.json({
    branches: db.branches || [],
    products: db.products || [],
    schedules: db.schedules || [],
    sales: db.sales || [],
    damaged: db.damaged || [],
    users: db.users || [],
    authUsers: db.authUsers || []
  })
})

// Save state
app.post('/api/state', (req, res) => {
  const current = readDB()
  const updated = { ...current, ...req.body }
  writeDB(updated)
  res.json({ ok: true })
})

// Ping
app.get('/api/ping', (req, res) => res.json({ ok: true }))

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')))

app.listen(3005, () => {
  console.log('Server running on http://localhost:3005')
})

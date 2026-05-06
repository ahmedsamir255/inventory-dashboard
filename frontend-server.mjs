import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const DIST = path.join(__dirname, 'dist')
app.use(express.static(DIST))
app.get(/.*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')))
app.listen(4173, '0.0.0.0', () => {
  console.log('Frontend running on http://0.0.0.0:4173')
  console.log('Network: http://10.10.69.10:4173')
})